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
const DEFAULT_MAX_RESULTS = 50;
const MAX_RESULTS_LIMIT = 50;
const MAX_GENERATION_ATTEMPTS = 3;

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
    "Do not prefix with labels like candidates.content.parts.text.",
    '{"jobs":[{"jobTitle":"string","companyName":"string","location":"string","referringURL":"https://...","jobDescription":"string","salary":"string","benefits":"string","remoteStatus":"remote|offline|hybrid","datePosted":"ISO-8601 string with timezone"}]}',
    "If salary or benefits are unavailable, set them to 'Not specified'.",
    "Only include unique jobs and provide direct listing URLs."
  ].join("\n");
}

function buildRetryPrompt(request: CrawlJobsRequest, attempt: number): string {
  if (attempt <= 1) {
    return buildPrompt(request);
  }

  return [
    buildPrompt(request),
    "Your previous response was rejected because it was not valid JSON.",
    "Return ONLY the JSON object. No prose, no labels, no markdown code fences."
  ].join("\n");
}

function buildJsonCandidates(text: string): string[] {
  const trimmed = text.trim();
  const candidates: string[] = [trimmed];

  const codeBlockPattern = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  for (const match of trimmed.matchAll(codeBlockPattern)) {
    const content = match[1]?.trim();
    if (content) {
      candidates.push(content);
    }
  }

  const firstObjectStart = trimmed.indexOf("{");
  const lastObjectEnd = trimmed.lastIndexOf("}");
  if (firstObjectStart >= 0 && lastObjectEnd > firstObjectStart) {
    candidates.push(trimmed.slice(firstObjectStart, lastObjectEnd + 1).trim());
  }

  return [...new Set(candidates)];
}

function tryParseJsonCandidate(candidate: string): unknown {
  const trimmed = candidate.trim();
  const attempts = [
    trimmed,
    trimmed.includes('\\"') ? trimmed.replace(/\\"/g, '"') : undefined,
    trimmed.includes("\\n") ? trimmed.replace(/\\n/g, "\n") : undefined,
    trimmed.includes('\\"') && trimmed.includes("\\n")
      ? trimmed.replace(/\\"/g, '"').replace(/\\n/g, "\n")
      : undefined
  ].filter((value): value is string => Boolean(value));

  let lastError: unknown;
  for (const attempt of [...new Set(attempts)]) {
    try {
      return JSON.parse(attempt);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function extractJobsFromUnknown(value: unknown): JobInput[] | undefined {
  if (value && typeof value === "object") {
    const candidate = value as { jobs?: unknown };
    if (Array.isArray(candidate.jobs)) {
      return candidate.jobs as JobInput[];
    }
  }

  if (typeof value === "string" && value.trim().length > 0) {
    for (const nestedCandidate of buildJsonCandidates(value)) {
      try {
        const parsedNested = tryParseJsonCandidate(nestedCandidate);
        const nestedJobs = extractJobsFromUnknown(parsedNested);
        if (nestedJobs) {
          return nestedJobs;
        }
      } catch {
        // Keep trying nested candidates.
      }
    }
  }

  return undefined;
}

function parseJsonPayload(text: string): { jobs: JobInput[] } {
  for (const candidate of buildJsonCandidates(text)) {
    try {
      const parsed = tryParseJsonCandidate(candidate);
      const jobs = extractJobsFromUnknown(parsed);
      if (jobs) {
        return { jobs };
      }
    } catch {
      // Continue trying candidate slices until all are exhausted.
    }
  }

  throw new Error("Gemini response was not valid JSON with a top-level jobs array.");
}

export class GeminiJobCrawler implements JobCrawler {
  async crawlJobs(request: CrawlJobsRequest): Promise<JobInput[]> {
    const apiKey = getGeminiApiKey();
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;

    const requestGeneration = async (prompt: string): Promise<string> => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
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

      return text;
    };

    let lastParseError: unknown;
    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const prompt = buildRetryPrompt(request, attempt);
      const text = await requestGeneration(prompt);

      try {
        const { jobs } = parseJsonPayload(text);
        return jobs;
      } catch (error) {
        lastParseError = error;
      }
    }

    const lastErrorMessage =
      lastParseError instanceof Error ? ` Last parse error: ${lastParseError.message}` : "";
    throw new Error(
      `Gemini produced invalid JSON output after ${MAX_GENERATION_ATTEMPTS} attempts.${lastErrorMessage}`
    );
  }
}
