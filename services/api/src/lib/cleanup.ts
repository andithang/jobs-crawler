import type { JobRecord } from "@jobs-crawler/shared";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getCleanupCutoffDate(now: Date): Date {
  return new Date(now.getTime() - 7 * ONE_DAY_MS);
}

export function selectExpiredJobs(jobs: JobRecord[], now: Date): JobRecord[] {
  const cutoff = getCleanupCutoffDate(now).getTime();

  return jobs.filter((job) => {
    const postedAt = Date.parse(job.datePosted);
    return Number.isFinite(postedAt) && postedAt < cutoff;
  });
}

