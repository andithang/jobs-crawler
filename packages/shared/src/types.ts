export type RemoteStatus = "remote" | "offline" | "hybrid";

export interface JobInput {
  jobTitle: string;
  companyName: string;
  location: string;
  referringURL: string;
  jobDescription: string;
  salary: string;
  benefits: string;
  remoteStatus: RemoteStatus;
  datePosted: string;
}

export interface JobRecord extends JobInput {
  jobId: string;
}

export interface JobSearchFilters {
  jobTitle?: string;
  location?: string;
  companyName?: string;
  referringURL?: string;
  remoteStatus?: RemoteStatus;
  datePosted?: string;
}

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
}

export interface PaginatedJobs {
  items: JobRecord[];
  nextCursor?: string;
  totalCount: number;
}

export interface FailedInsert {
  index: number;
  reason: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

