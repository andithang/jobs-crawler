import type { JobRecord, JobSearchFilters, PaginatedJobs } from "@jobs-crawler/shared";

export interface JobRepository {
  putJobs(jobs: JobRecord[]): Promise<void>;
  searchJobs(filters: JobSearchFilters, limit: number, cursor?: string): Promise<PaginatedJobs>;
  getAllJobs(): Promise<JobRecord[]>;
  deleteJobs(jobKeys: Array<{ jobId: string; datePosted: string }>): Promise<number>;
}

