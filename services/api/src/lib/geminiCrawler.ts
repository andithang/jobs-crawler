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
    "You are a job data extraction engine for a DynamoDB ingestion pipeline.",
    `Find real, active job listings from the public internet using Google Search for this intent: \"${request.crawlQuery}\".`,
    `Return at most ${maxResults} jobs.`,
    "Output rules:",
    "- Return only valid JSON.",
    "- No markdown.",
    "- Top-level object must be exactly: {\"jobs\":[...]}.",
    "- Each job must include non-empty strings for: jobTitle, companyName, location, referringURL, jobDescription, salary, benefits, remoteStatus, datePosted.",
    "- remoteStatus must be one of: remote, offline, hybrid.",
    "- datePosted must be ISO-8601 with timezone.",
    "- referringURL must be an absolute https URL to the direct job listing.",
    "- If salary is unavailable use \"Not specified\".",
    "- If benefits are unavailable use \"Not specified\".",
    "- Deduplicate jobs by referringURL.",
    "Return final JSON now."
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
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey
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
        tools: [{ google_search: {} }]
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
