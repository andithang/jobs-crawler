import React, { useEffect, useRef, useState } from "react";
import type { JobRecord, JobSearchFilters } from "@jobs-crawler/shared";
import { fetchJobsFromApi, normalizeFilterInput } from "../lib/jobsClient";

const PAGE_SIZE = 20;

type PageProps = {
  jobs: JobRecord[];
  totalCount: number;
  initialFilters: Partial<JobSearchFilters>;
  errorMessage?: string;
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

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

function hasSalaryValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "not specified";
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
  isLoading,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  theme,
  onToggleTheme
}: PageProps) {
  const resultsSectionRef = useRef<HTMLElement | null>(null);
  const previousPageRef = useRef(currentPage);

  useEffect(() => {
    if (previousPageRef.current !== currentPage) {
      resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      previousPageRef.current = currentPage;
    }
  }, [currentPage]);

  const startIndex = jobs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = jobs.length === 0 ? 0 : startIndex + jobs.length - 1;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 py-5 text-slate-900 sm:px-6 sm:py-8 lg:px-8 dark:text-slate-100">
      <section className="rounded-2xl bg-white/90 p-4 shadow-lg shadow-slate-200/60 sm:p-6 dark:bg-slate-900/90 dark:shadow-slate-900/60">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-semibold">Jobs Crawler</h1>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            aria-label={theme === "light" ? "Enable dark mode" : "Enable light mode"}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
            {theme === "light" ? "Dark" : "Light"}
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Browse jobs pulled from DynamoDB through API Gateway + Lambda.
        </p>

        <form method="GET" className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 sm:mt-6 sm:gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Job title
            <input
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm sm:px-3 sm:py-2 dark:border-slate-700 dark:bg-slate-800"
              name="jobTitle"
              defaultValue={initialFilters.jobTitle ?? ""}
              placeholder="e.g. Backend Engineer"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Location
            <input
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm sm:px-3 sm:py-2 dark:border-slate-700 dark:bg-slate-800"
              name="location"
              defaultValue={initialFilters.location ?? ""}
              placeholder="e.g. Bangkok"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Company
            <input
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm sm:px-3 sm:py-2 dark:border-slate-700 dark:bg-slate-800"
              name="companyName"
              defaultValue={initialFilters.companyName ?? ""}
              placeholder="e.g. Acme"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Referring URL
            <input
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm sm:px-3 sm:py-2 dark:border-slate-700 dark:bg-slate-800"
              name="referringURL"
              defaultValue={initialFilters.referringURL ?? ""}
              placeholder="jobs.example.com"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Remote status
            <select
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm sm:px-3 sm:py-2 dark:border-slate-700 dark:bg-slate-800"
              name="remoteStatus"
              defaultValue={initialFilters.remoteStatus ?? ""}
            >
              <option value="">Any</option>
              <option value="remote">Remote</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Date posted
            <input
              type="date"
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm sm:px-3 sm:py-2 dark:border-slate-700 dark:bg-slate-800"
              name="datePosted"
              defaultValue={toDateInputValue(initialFilters.datePosted)}
            />
          </label>

          <div className="md:col-span-2 lg:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 sm:px-4 sm:py-2"
            >
              Apply filters
            </button>
            <a href="/" className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-500">
              Reset
            </a>
          </div>
        </form>
      </section>

      <section ref={resultsSectionRef} className="mt-6 rounded-2xl bg-white/90 p-4 shadow-lg shadow-slate-200/60 sm:p-6 dark:bg-slate-900/90 dark:shadow-slate-900/60">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Results</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {startIndex}-{endIndex} of {totalCount} matching jobs
          </p>
        </div>

        {isLoading ? <p className="text-sm text-slate-600 dark:text-slate-300">Loading jobs...</p> : null}
        {errorMessage ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}

        {!isLoading && jobs.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No jobs found for the selected filters.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <article
                key={`${job.jobId}-${job.datePosted}`}
                className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{job.jobTitle}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {job.companyName} - {job.location} - {job.remoteStatus}
                </p>
                {hasSalaryValue(job.salary) ? (
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Salary: {job.salary}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Posted: {formatDateLabel(job.datePosted)}</p>
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{job.jobDescription}</p>
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

        {!isLoading && totalCount > 0 ? (
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={currentPage <= 1}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </p>
            <button
              type="button"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
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
  const [currentPage, setCurrentPage] = useState(1);
  const [theme, setTheme] = useState<"light" | "dark">("light");

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
      setCurrentPage(1);
      setErrorMessage(undefined);
    } catch (error) {
      setJobs([]);
      setTotalCount(0);
      setCurrentPage(1);
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("jobs-crawler-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : prefersDark ? "dark" : "light";
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("jobs-crawler-theme", theme);
  }, [theme]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedJobs = jobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <JobsPageView
      jobs={paginatedJobs}
      totalCount={totalCount}
      initialFilters={initialFilters}
      errorMessage={errorMessage}
      isLoading={isLoading}
      currentPage={currentPage}
      totalPages={totalPages}
      onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
      onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
      theme={theme}
      onToggleTheme={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
    />
  );
}
