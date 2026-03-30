import { z } from "zod";
import type { FailedInsert, JobInput, JobSearchFilters, RemoteStatus } from "@jobs-crawler/shared";

const remoteStatusSchema = z
  .string()
  .transform((value) => value.trim().toLocaleLowerCase())
  .pipe(z.enum(["remote", "offline", "hybrid"]));

const jobInputSchema = z.object({
  jobTitle: z.string().trim().min(1),
  companyName: z.string().trim().min(1),
  location: z.string().trim().min(1),
  referringURL: z.string().url(),
  jobDescription: z.string().trim().min(1),
  salary: z.string().trim().min(1),
  benefits: z.string().trim().min(1),
  remoteStatus: remoteStatusSchema,
  datePosted: z.string().datetime({ offset: true })
});

function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseInsertRequest(payload: unknown): { validJobs: JobInput[]; failed: FailedInsert[] } {
  const parsed = z.object({ jobs: z.array(z.unknown()).min(1) }).safeParse(payload);
  if (!parsed.success) {
    throw new Error("Request body must include jobs[] or set a non-empty defaultCrawlQuery.");
  }

  const validJobs: JobInput[] = [];
  const failed: FailedInsert[] = [];

  parsed.data.jobs.forEach((job, index) => {
    const candidate = jobInputSchema.safeParse(job);
    if (!candidate.success) {
      failed.push({
        index,
        reason: candidate.error.issues.map((issue) => issue.message).join("; ")
      });
      return;
    }

    validJobs.push(candidate.data);
  });

  return { validJobs, failed };
}

export function parseSearchFilters(input: Record<string, string | undefined> | null | undefined): {
  filters: JobSearchFilters;
  limit: number;
  cursor?: string;
} {
  const source = input ?? {};

  const remoteStatusRaw = trimString(source.remoteStatus);
  const remoteStatusParsed = remoteStatusRaw ? remoteStatusSchema.safeParse(remoteStatusRaw) : undefined;

  const filters: JobSearchFilters = {
    jobTitle: trimString(source.jobTitle),
    location: trimString(source.location),
    companyName: trimString(source.companyName),
    referringURL: trimString(source.referringURL),
    datePosted: trimString(source.datePosted),
    remoteStatus: remoteStatusParsed?.success ? (remoteStatusParsed.data as RemoteStatus) : undefined
  };

  const requestedLimit = Number.parseInt(source.limit ?? "20", 10);
  const normalizedLimit = Number.isFinite(requestedLimit) ? requestedLimit : 20;
  const limit = Math.min(Math.max(normalizedLimit, 1), 100);

  const cursor = trimString(source.cursor);

  return { filters, limit, cursor };
}

