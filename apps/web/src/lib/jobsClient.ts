import type { JobSearchFilters, PaginatedJobs } from "@jobs-crawler/shared";

export interface FetchJobsOptions {
  apiBaseUrl: string;
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

function buildJobsEndpoint(
  apiBaseUrl: string,
  filters: Partial<JobSearchFilters>,
  cursor?: string,
  limit = 100
): string {
  const query = new URLSearchParams(buildJobsQueryString(filters));
  query.set("limit", String(limit));
  if (cursor) {
    query.set("cursor", cursor);
  }

  const queryString = query.toString();
  return `${apiBaseUrl.replace(/\/$/, "")}/jobs${queryString ? `?${queryString}` : ""}`;
}

export async function fetchJobsFromApi(
  filters: Partial<JobSearchFilters>,
  options: FetchJobsOptions
): Promise<PaginatedJobs> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let cursor: string | undefined;
  let totalCount = 0;
  const items: PaginatedJobs["items"] = [];

  do {
    const endpoint = buildJobsEndpoint(options.apiBaseUrl, filters, cursor, 100);
    const response = await fetchImpl(endpoint, {
      method: "GET",
      headers: {
        "content-type": "application/json"
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

    items.push(...payload.data.items);
    totalCount = payload.data.totalCount;
    cursor = payload.data.nextCursor;
  } while (cursor);

  return {
    items,
    totalCount,
    nextCursor: undefined
  };
}

export async function insertJobsFromApi(
  options: FetchJobsOptions
): Promise<{ insertedCount: number; failed: Array<{ index: number; reason: string }> }> {
  const endpoint = `${options.apiBaseUrl.replace(/\/$/, "")}/jobs`;

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    throw new Error(`Failed to insert jobs. Status: ${response.status}`);
  }

  const payload = (await response.json()) as {
    success: boolean;
    data?: { insertedCount: number; failed: Array<{ index: number; reason: string }> };
    error?: { message?: string };
  };

  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Insert jobs API returned an invalid response.");
  }

  return payload.data;
}
