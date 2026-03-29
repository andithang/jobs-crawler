import type { JobRecord, JobSearchFilters, PaginatedJobs } from "@jobs-crawler/shared";
import type { JobRepository } from "../src/lib/repository";

export class InMemoryJobRepository implements JobRepository {
  private readonly items = new Map<string, JobRecord>();

  async putJobs(jobs: JobRecord[]): Promise<void> {
    for (const job of jobs) {
      this.items.set(this.toKey(job), job);
    }
  }

  async searchJobs(filters: JobSearchFilters, limit: number, cursor?: string): Promise<PaginatedJobs> {
    const { applySearchFilters } = await import("../src/lib/filtering");
    const all = [...this.items.values()].sort((a, b) => b.datePosted.localeCompare(a.datePosted));
    const filtered = applySearchFilters(all, filters);

    const offset = cursor ? Number.parseInt(Buffer.from(cursor, "base64url").toString("utf8"), 10) : 0;
    const page = filtered.slice(offset, offset + limit);
    const nextOffset = offset + page.length;

    return {
      items: page,
      totalCount: filtered.length,
      nextCursor: nextOffset < filtered.length ? Buffer.from(String(nextOffset)).toString("base64url") : undefined
    };
  }

  async getAllJobs(): Promise<JobRecord[]> {
    return [...this.items.values()];
  }

  async deleteJobs(jobKeys: Array<{ jobId: string; datePosted: string }>): Promise<number> {
    let deleted = 0;
    for (const key of jobKeys) {
      const existed = this.items.delete(this.toKey(key));
      if (existed) {
        deleted += 1;
      }
    }

    return deleted;
  }

  private toKey(input: { jobId: string; datePosted: string }): string {
    return `${input.jobId}::${input.datePosted}`;
  }
}

