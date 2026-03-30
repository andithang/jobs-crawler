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

  it("uses hardcoded default crawl query when jobs[] and crawlQuery are both missing", async () => {
    const repository = new InMemoryJobRepository();
    let crawlCalled = false;

    const handler = buildInsertJobsHandler({
      repository,
      idGenerator: () => "unused-id",
      crawler: {
        crawlJobs: async () => {
          crawlCalled = true;
          return [
            {
              jobTitle: "Platform Engineer",
              companyName: "Fallback Co",
              location: "Remote",
              referringURL: "https://jobs.example.com/fallback-1",
              jobDescription: "Maintain distributed systems.",
              salary: "Not specified",
              benefits: "Not specified",
              remoteStatus: "remote",
              datePosted: "2026-03-20T00:00:00.000Z"
            }
          ];
        }
      }
    });

    const response = await handler({
      body: JSON.stringify({})
    } as never);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: { insertedCount: number } };
    expect(body.data.insertedCount).toBe(1);
    expect(crawlCalled).toBe(true);

    const inserted = await repository.getAllJobs();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.jobId).toBe("unused-id");
  });

  it("returns 202 immediately when waitForCompletion is false", async () => {
    const repository = new InMemoryJobRepository();
    let resolveCrawl: ((jobs: Array<Record<string, string>>) => void) | undefined;

    const handler = buildInsertJobsHandler({
      repository,
      idGenerator: () => "async-id",
      crawler: {
        crawlJobs: async () =>
          new Promise<Array<Record<string, string>>>((resolve) => {
            resolveCrawl = resolve;
          })
      }
    });

    const response = await handler({
      body: JSON.stringify({
        crawlQuery: "frontend software engineer jobs in hanoi vietnam",
        waitForCompletion: false
      })
    } as never);

    expect(response.statusCode).toBe(202);
    const responseBody = JSON.parse(response.body) as { data: { accepted: boolean } };
    expect(responseBody.data.accepted).toBe(true);

    const beforeResolve = await repository.getAllJobs();
    expect(beforeResolve).toHaveLength(0);

    resolveCrawl?.([
      {
        jobTitle: "Frontend Engineer",
        companyName: "Example Co",
        location: "Hanoi, Vietnam",
        referringURL: "https://jobs.example.com/hn-fe-1",
        jobDescription: "Build frontend applications.",
        salary: "Not specified",
        benefits: "Not specified",
        remoteStatus: "hybrid",
        datePosted: "2026-03-30T00:00:00.000Z"
      }
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const inserted = await repository.getAllJobs();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.jobId).toBe("async-id");
  });
});
