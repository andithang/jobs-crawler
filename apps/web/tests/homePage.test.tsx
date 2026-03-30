import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";
import { JobsPageView } from "../src/pages/index";
import type { JobRecord } from "@jobs-crawler/shared";

const sampleJobs: JobRecord[] = [
  {
    jobId: "1",
    jobTitle: "Backend Engineer",
    companyName: "Acme",
    location: "Bangkok",
    referringURL: "https://jobs.example.com/1",
    jobDescription: "Build APIs",
    salary: "$100k",
    benefits: "Health",
    remoteStatus: "remote",
    datePosted: "2026-03-20T00:00:00.000Z"
  }
];

describe("JobsPageView", () => {
  it("renders filters and job cards", () => {
    render(
      <JobsPageView
        jobs={sampleJobs}
        totalCount={1}
        initialFilters={{}}
        currentPage={1}
        totalPages={1}
        onPreviousPage={() => {}}
        onNextPage={() => {}}
      />
    );

    expect(screen.getByRole("heading", { name: "Jobs Crawler" })).toBeInTheDocument();
    expect(screen.getByLabelText("Job title")).toBeInTheDocument();
    expect(screen.getByLabelText("Location")).toBeInTheDocument();
    expect(screen.getByLabelText("Company")).toBeInTheDocument();
    expect(screen.getByLabelText("Referring URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Date posted")) .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Insert jobs manually" })).not.toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Salary: $100k")).toBeInTheDocument();
  });
});
