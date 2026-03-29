import { describe, expect, it } from "vitest";
import { parseInsertRequest, parseSearchFilters } from "../src/lib/validation";

describe("parseInsertRequest", () => {
  it("returns valid jobs and collects invalid items", () => {
    const parsed = parseInsertRequest({
      jobs: [
        {
          jobTitle: "Backend Engineer",
          companyName: "Acme",
          location: "Remote",
          referringURL: "https://jobs.example.com/10",
          jobDescription: "API work",
          salary: "$100k",
          benefits: "Health",
          remoteStatus: "REMOTE",
          datePosted: "2026-03-20T00:00:00.000Z"
        },
        {
          jobTitle: "",
          companyName: "Broken",
          location: "Remote",
          referringURL: "not-a-url",
          jobDescription: "",
          salary: "",
          benefits: "",
          remoteStatus: "remote",
          datePosted: "bad-date"
        }
      ]
    });

    expect(parsed.validJobs).toHaveLength(1);
    expect(parsed.validJobs[0]?.remoteStatus).toBe("remote");
    expect(parsed.failed).toHaveLength(1);
    expect(parsed.failed[0]?.index).toBe(1);
  });
});

describe("parseSearchFilters", () => {
  it("normalizes text filters and clamps limit", () => {
    const parsed = parseSearchFilters({
      jobTitle: "  Engineer  ",
      limit: "1000"
    });

    expect(parsed.filters.jobTitle).toBe("Engineer");
    expect(parsed.limit).toBe(100);
  });
});

