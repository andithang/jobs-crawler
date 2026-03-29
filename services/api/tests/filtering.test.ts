import { describe, expect, it } from "vitest";
import { applySearchFilters } from "../src/lib/filtering";
import type { JobRecord } from "@jobs-crawler/shared";

const jobs: JobRecord[] = [
  {
    jobId: "1",
    jobTitle: "Senior Node Engineer",
    companyName: "Acme Inc",
    location: "Bangkok",
    referringURL: "https://jobs.example.com/1",
    jobDescription: "Build APIs",
    salary: "$120k",
    benefits: "Health",
    remoteStatus: "remote",
    datePosted: "2026-03-20T00:00:00.000Z"
  },
  {
    jobId: "2",
    jobTitle: "Frontend Developer",
    companyName: "Globex",
    location: "Chiang Mai",
    referringURL: "https://jobs.example.com/2",
    jobDescription: "Build web apps",
    salary: "$100k",
    benefits: "Dental",
    remoteStatus: "offline",
    datePosted: "2026-03-18T00:00:00.000Z"
  }
];

describe("applySearchFilters", () => {
  it("filters text fields using case-insensitive contains", () => {
    const result = applySearchFilters(jobs, {
      jobTitle: "node",
      companyName: "ACME",
      location: "bang"
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.jobId).toBe("1");
  });

  it("applies exact match for remote status and datePosted", () => {
    const result = applySearchFilters(jobs, {
      remoteStatus: "offline",
      datePosted: "2026-03-18T00:00:00.000Z"
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.jobId).toBe("2");
  });

  it("supports date-only filtering from UI input", () => {
    const result = applySearchFilters(jobs, {
      datePosted: "2026-03-20"
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.jobId).toBe("1");
  });
});

