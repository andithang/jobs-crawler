import { describe, expect, it } from "vitest";
import { buildInsertJobsHandler } from "../src/handlers/insertJobs";
import { InMemoryJobRepository } from "./inMemoryRepository";

describe("POST /jobs handler", () => {
  it("inserts valid jobs and reports failed items", async () => {
    const repository = new InMemoryJobRepository();

    const handler = buildInsertJobsHandler({
      repository,
      idGenerator: () => "generated-id"
    });

    const response = await handler({
      body: JSON.stringify({
        jobs: [
          {
            jobTitle: "Backend Engineer",
            companyName: "Acme",
            location: "Remote",
            referringURL: "https://jobs.example.com/10",
            jobDescription: "API work",
            salary: "$100k",
            benefits: "Health",
            remoteStatus: "remote",
            datePosted: "2026-03-20T00:00:00.000Z"
          },
          {
            jobTitle: "",
            companyName: "Broken",
            location: "Remote",
            referringURL: "invalid",
            jobDescription: "",
            salary: "",
            benefits: "",
            remoteStatus: "remote",
            datePosted: "bad"
          }
        ]
      })
    } as never);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: { insertedCount: number; failed: Array<{ index: number }> } };

    expect(body.data.insertedCount).toBe(1);
    expect(body.data.failed).toHaveLength(1);

    const inserted = await repository.getAllJobs();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.jobId).toBe("generated-id");
  });

  it("crawls jobs with Gemini when crawlQuery is provided", async () => {
    const repository = new InMemoryJobRepository();

    const handler = buildInsertJobsHandler({
      repository,
      idGenerator: () => "crawled-id",
      crawler: {
        crawlJobs: async () => [
          {
            jobTitle: "ML Engineer",
            companyName: "Example Co",
            location: "United States",
            referringURL: "https://jobs.example.com/ml-1",
            jobDescription: "Work on LLM pipelines.",
            salary: "Not specified",
            benefits: "Not specified",
            remoteStatus: "remote",
            datePosted: "2026-03-20T00:00:00.000Z"
          }
        ]
      }
    });

    const response = await handler({
      body: JSON.stringify({
        crawlQuery: "machine learning engineer remote united states"
      })
    } as never);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: { insertedCount: number } };
    expect(body.data.insertedCount).toBe(1);

    const inserted = await repository.getAllJobs();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.jobId).toBe("crawled-id");
  });

  it("returns 400 when jobs[] and crawlQuery are both missing", async () => {
    const repository = new InMemoryJobRepository();
    let crawlCalled = false;

    const handler = buildInsertJobsHandler({
      repository,
      idGenerator: () => "unused-id",
      crawler: {
        crawlJobs: async () => {
          crawlCalled = true;
          return [];
        }
      }
    });

    const response = await handler({
      body: JSON.stringify({})
    } as never);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: { message: string } };
    expect(body.error.message).toBe("Request body must include jobs[] or a non-empty crawlQuery.");
    expect(crawlCalled).toBe(false);

    const inserted = await repository.getAllJobs();
    expect(inserted).toHaveLength(0);
  });
});
