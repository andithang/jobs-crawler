import type { JobSearchFilters, PaginatedJobs } from "@jobs-crawler/shared";

export interface FetchJobsOptions {
  apiBaseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

function getStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeFilterInput(filters: Partial<Record<keyof JobSearchFilters, unknown>>): JobSearchFilters {
  return {
    jobTitle: getStringValue(filters.jobTitle),
    location: getStringValue(filters.location),
    companyName: getStringValue(filters.companyName),
    referringURL: getStringValue(filters.referringURL),
    remoteStatus: getStringValue(filters.remoteStatus) as JobSearchFilters["remoteStatus"],
    datePosted: getStringValue(filters.datePosted)
  };
}

export function buildJobsQueryString(filters: Partial<JobSearchFilters>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        query.set(key, trimmed);
      }
    }
  }

  return query.toString();
}

export async function fetchJobsFromApi(
  filters: Partial<JobSearchFilters>,
  options: FetchJobsOptions
): Promise<PaginatedJobs> {
  const queryString = buildJobsQueryString(filters);
  const endpoint = `${options.apiBaseUrl.replace(/\/$/, "")}/jobs${queryString ? `?${queryString}` : ""}`;

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(endpoint, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      "x-api-key": options.apiKey
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch jobs. Status: ${response.status}`);
  }

  const payload = (await response.json()) as {
    success: boolean;
    data?: PaginatedJobs;
    error?: { message?: string };
  };

  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Jobs API returned an invalid response.");
  }

  return payload.data;
}

