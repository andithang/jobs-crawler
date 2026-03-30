import type { APIGatewayProxyResult, EventBridgeEvent } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import type { JobRecord } from "@jobs-crawler/shared";
import type { JobRepository } from "../lib/repository";
import { DynamoDbJobRepository } from "../lib/dynamodbRepository";
import { GeminiJobCrawler, type JobCrawler } from "../lib/geminiCrawler";
import { failure, success } from "../lib/http";
import { parseInsertRequest } from "../lib/validation";

interface Dependencies {
  repository: JobRepository;
  idGenerator: () => string;
  crawler: JobCrawler;
  defaultCrawlQuery?: string;
  maxResults?: number;
}

export function buildInsertJobsHandler(deps?: Partial<Dependencies>) {
  const repository = deps?.repository ?? new DynamoDbJobRepository();
  const idGenerator = deps?.idGenerator ?? uuidv4;
  const crawler = deps?.crawler ?? new GeminiJobCrawler();
  const defaultCrawlQuery =
    deps?.defaultCrawlQuery?.trim() ||
    `
    You are a job data extraction engine for a DynamoDB ingestion pipeline.

    TASK
    Find real, currently active Frontend job listings in Hanoi, Vietnam on the public internet using web search for this intent:
    "{{CRAWL_QUERY}}"

    OUTPUT RULES (STRICT)
    1) Return ONLY valid JSON.
    2) Do NOT return markdown.
    3) Do NOT return explanations or extra keys.
    4) Top-level object must be exactly:
    {
      "jobs": [ ... ]
    }
    5) Each item in "jobs" must contain ALL fields below (no missing fields):
    - jobTitle (string)
    - companyName (string)
    - location (string)
    - referringURL (string, absolute https URL to original listing page)
    - jobDescription (string)
    - salary (string)
    - benefits (string)
    - remoteStatus (string enum: "remote" | "offline" | "hybrid")
    - datePosted (string, ISO-8601 with timezone, e.g. "2026-03-30T00:00:00.000Z")

    QUALITY + NORMALIZATION RULES
    - Return at most {{MAX_RESULTS}} jobs.
    - Include only unique jobs (dedupe by referringURL).
    - Only include postings that appear to be real job listings (not blog posts, category pages, or search result pages).
    - referringURL must be the direct job listing URL, not homepage.
    - remoteStatus mapping:
      - fully remote => "remote"
      - on-site / in-office => "offline"
      - hybrid => "hybrid"
    - If salary is unavailable, set salary to "Not specified".
    - If benefits are unavailable, set benefits to "Not specified".
    - If jobDescription is long, summarize to 1-3 sentences while preserving key responsibilities.
    - Prefer jobs posted recently; if exact posting date is not available, estimate conservatively and still return valid ISO-8601 with timezone.
    - All strings must be non-empty and trimmed.

    VALIDATION CHECK BEFORE FINALIZING
    - Ensure JSON parses.
    - Ensure every job has all required keys and correct enum/date/url formats.
    - Ensure no null values.
    - Ensure no duplicate referringURL.

    Return final JSON now.
  `;
  const maxResults = typeof deps?.maxResults === "number" ? deps.maxResults : undefined;

  return async (_event: EventBridgeEvent<string, unknown>): Promise<APIGatewayProxyResult> => {
    try {
      const crawledJobs = await crawler.crawlJobs({ crawlQuery: defaultCrawlQuery, maxResults });
      if (crawledJobs.length === 0) {
        return success(200, {
          insertedCount: 0,
          failed: []
        });
      }

      const { validJobs, failed } = parseInsertRequest({ jobs: crawledJobs });

      const records: JobRecord[] = validJobs.map((job) => ({
        ...job,
        jobId: idGenerator()
      }));

      await repository.putJobs(records);

      return success(200, {
        insertedCount: records.length,
        failed
      });
    } catch (error) {
      return failure(500, "INSERT_FAILED", (error as Error).message);
    }
  };
}

export const handler = buildInsertJobsHandler();
