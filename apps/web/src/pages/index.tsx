import React, { useEffect, useState } from "react";
import type { JobRecord, JobSearchFilters } from "@jobs-crawler/shared";
import { fetchJobsFromApi, normalizeFilterInput } from "../lib/jobsClient";

type PageProps = {
  jobs: JobRecord[];
  totalCount: number;
  initialFilters: Partial<JobSearchFilters>;
  errorMessage?: string;
  isLoading?: boolean;
};

function formatDateLabel(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function toDateInputValue(value?: string): string {
  if (!value) {
    return "";
  }

  return value.length >= 10 ? value.slice(0, 10) : value;
}

function parseFiltersFromLocation(): Partial<JobSearchFilters> {
  const params = new URLSearchParams(window.location.search);

  return normalizeFilterInput({
    jobTitle: params.get("jobTitle") ?? undefined,
    location: params.get("location") ?? undefined,
    companyName: params.get("companyName") ?? undefined,
    referringURL: params.get("referringURL") ?? undefined,
    remoteStatus: params.get("remoteStatus") ?? undefined,
    datePosted: params.get("datePosted") ?? undefined
  });
}

export function JobsPageView({
  jobs,
  totalCount,
  initialFilters,
  errorMessage,
  isLoading
}: PageProps) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-white/90 p-6 shadow-lg shadow-slate-200/60">
        <h1 className="text-3xl font-semibold text-slate-900">Jobs Crawler</h1>
        <p className="mt-2 text-sm text-slate-600">
          Browse jobs pulled from DynamoDB through API Gateway + Lambda.
        </p>

        <form method="GET" className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Job title
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              name="jobTitle"
              defaultValue={initialFilters.jobTitle ?? ""}
              placeholder="e.g. Backend Engineer"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Location
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              name="location"
              defaultValue={initialFilters.location ?? ""}
              placeholder="e.g. Bangkok"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Company
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              name="companyName"
              defaultValue={initialFilters.companyName ?? ""}
              placeholder="e.g. Acme"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Referring URL
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              name="referringURL"
              defaultValue={initialFilters.referringURL ?? ""}
              placeholder="jobs.example.com"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Remote status
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              name="remoteStatus"
              defaultValue={initialFilters.remoteStatus ?? ""}
            >
              <option value="">Any</option>
              <option value="remote">Remote</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Date posted
            <input
              type="date"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              name="datePosted"
              defaultValue={toDateInputValue(initialFilters.datePosted)}
            />
          </label>

          <div className="md:col-span-2 lg:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Apply filters
            </button>
            <a href="/" className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline">
              Reset
            </a>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl bg-white/90 p-6 shadow-lg shadow-slate-200/60">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900">Results</h2>
          <p className="text-sm text-slate-600">{totalCount} matching jobs</p>
        </div>

        {isLoading ? <p className="text-sm text-slate-600">Loading jobs...</p> : null}
        {errorMessage ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}

        {!isLoading && jobs.length === 0 ? (
          <p className="text-sm text-slate-600">No jobs found for the selected filters.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <article key={`${job.jobId}-${job.datePosted}`} className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-slate-900">{job.jobTitle}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {job.companyName} - {job.location} - {job.remoteStatus}
                </p>
                <p className="mt-1 text-xs text-slate-500">Posted: {formatDateLabel(job.datePosted)}</p>
                <p className="mt-3 text-sm text-slate-700">{job.jobDescription}</p>
                <a
                  className="mt-3 inline-block text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
                  href={job.referringURL}
                  target="_blank"
                  rel="noreferrer"
                >
                  View listing
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [initialFilters, setInitialFilters] = useState<Partial<JobSearchFilters>>({});
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      const apiBaseUrl = process.env.NEXT_PUBLIC_JOBS_API_BASE_URL;
      const filters = parseFiltersFromLocation();
      setInitialFilters(filters);

      if (!apiBaseUrl) {
        setJobs([]);
        setTotalCount(0);
        setErrorMessage("Missing NEXT_PUBLIC_JOBS_API_BASE_URL.");
        setIsLoading(false);
        return;
      }

      try {
        const result = await fetchJobsFromApi(filters, { apiBaseUrl });
        setJobs(result.items);
        setTotalCount(result.totalCount);
        setErrorMessage(undefined);
      } catch (error) {
        setJobs([]);
        setTotalCount(0);
        setErrorMessage((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadJobs();
  }, []);

  return (
    <JobsPageView
      jobs={jobs}
      totalCount={totalCount}
      initialFilters={initialFilters}
      errorMessage={errorMessage}
      isLoading={isLoading}
    />
  );
}
