import type { JobInput } from "@jobs-crawler/shared";

export interface CrawlJobsRequest {
  crawlQuery: string;
  maxResults?: number;
}

export interface JobCrawler {
  crawlJobs(request: CrawlJobsRequest): Promise<JobInput[]>;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_MAX_RESULTS = 20;
const MAX_RESULTS_LIMIT = 50;

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return apiKey;
}

function normalizeMaxResults(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_MAX_RESULTS;
  }
  return Math.min(Math.max(Math.floor(value), 1), MAX_RESULTS_LIMIT);
}

function buildPrompt(request: CrawlJobsRequest): string {
  const maxResults = normalizeMaxResults(request.maxResults);
  return [
    "Find real job listings on the public internet using web search.",
    `Search intent: ${request.crawlQuery}`,
    `Return up to ${maxResults} jobs.`,
    "Output strictly valid JSON with this shape and no markdown:",
    '{"jobs":[{"jobTitle":"string","companyName":"string","location":"string","referringURL":"https://...","jobDescription":"string","salary":"string","benefits":"string","remoteStatus":"remote|offline|hybrid","datePosted":"ISO-8601 string with timezone"}]}',
    "If salary or benefits are unavailable, set them to 'Not specified'.",
    "Only include unique jobs and provide direct listing URLs."
  ].join("\n");
}

function parseJsonPayload(text: string): { jobs: JobInput[] } {
  const parsed = JSON.parse(text) as { jobs?: JobInput[] };
  if (!parsed.jobs || !Array.isArray(parsed.jobs)) {
    throw new Error("Gemini response did not contain a jobs array.");
  }
  return { jobs: parsed.jobs };
}

export class GeminiJobCrawler implements JobCrawler {
  async crawlJobs(request: CrawlJobsRequest): Promise<JobInput[]> {
    const apiKey = getGeminiApiKey();
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(request) }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        },
        tools: [{ web_search: {} }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    const { jobs } = parseJsonPayload(text);
    return jobs;
  }
}
