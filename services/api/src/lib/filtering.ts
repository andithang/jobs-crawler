import type { JobRecord, JobSearchFilters } from "@jobs-crawler/shared";

function containsIgnoreCase(value: string, search: string): boolean {
  return value.toLocaleLowerCase().includes(search.toLocaleLowerCase());
}

export function applySearchFilters(jobs: JobRecord[], filters: JobSearchFilters): JobRecord[] {
  return jobs.filter((job) => {
    if (filters.jobTitle && !containsIgnoreCase(job.jobTitle, filters.jobTitle)) {
      return false;
    }

    if (filters.companyName && !containsIgnoreCase(job.companyName, filters.companyName)) {
      return false;
    }

    if (filters.location && !containsIgnoreCase(job.location, filters.location)) {
      return false;
    }

    if (filters.referringURL && !containsIgnoreCase(job.referringURL, filters.referringURL)) {
      return false;
    }

    if (filters.remoteStatus && job.remoteStatus !== filters.remoteStatus) {
      return false;
    }

    if (filters.datePosted) {
      const isDateOnly = filters.datePosted.length === 10;
      if (isDateOnly && !job.datePosted.startsWith(filters.datePosted)) {
        return false;
      }

      if (!isDateOnly && job.datePosted !== filters.datePosted) {
        return false;
      }
    }

    return true;
  });
}

