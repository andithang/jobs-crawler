import { describe, expect, it } from "vitest";
import { selectExpiredJobs } from "../src/lib/cleanup";
import type { JobRecord } from "@jobs-crawler/shared";

describe("selectExpiredJobs", () => {
  it("returns jobs older than 7 days", () => {
    const now = new Date("2026-03-29T00:00:00.000Z");
    const jobs: JobRecord[] = [
      {
        jobId: "fresh",
        jobTitle: "Fresh",
        companyName: "Co",
        location: "A",
        referringURL: "https://jobs.example.com/fresh",
        jobDescription: "desc",
        salary: "1",
        benefits: "1",
        remoteStatus: "remote",
        datePosted: "2026-03-25T00:00:00.000Z"
      },
      {
        jobId: "old",
        jobTitle: "Old",
        companyName: "Co",
        location: "B",
        referringURL: "https://jobs.example.com/old",
        jobDescription: "desc",
        salary: "1",
        benefits: "1",
        remoteStatus: "offline",
        datePosted: "2026-03-10T00:00:00.000Z"
      }
    ];

    const expired = selectExpiredJobs(jobs, now);

    expect(expired).toHaveLength(1);
    expect(expired[0]?.jobId).toBe("old");
  });
});

