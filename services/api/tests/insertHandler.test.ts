import { describe, expect, it } from "vitest";
import { buildInsertJobsHandler } from "../src/handlers/insertJobs";
import { InMemoryJobRepository } from "./inMemoryRepository";

describe("insert jobs scheduled handler", () => {
  it("crawls and inserts valid jobs while reporting failed items", async () => {
    const repository = new InMemoryJobRepository();
    let receivedQuery: string | undefined;
    let receivedMaxResults: number | undefined;

    const handler = buildInsertJobsHandler({
      repository,
      idGenerator: () => "generated-id",
      defaultCrawlQuery: "frontend jobs in hanoi vietnam",
      maxResults: 50,
      crawler: {
        crawlJobs: async ({ crawlQuery, maxResults }) => {
          receivedQuery = crawlQuery;
          receivedMaxResults = maxResults;

          return [
            {
              jobTitle: "Frontend Engineer",
              companyName: "Acme",
              location: "Hanoi, Vietnam",
              referringURL: "https://jobs.example.com/fe-1",
              jobDescription: "Build frontend apps.",
              salary: "$1200",
              benefits: "Health",
              remoteStatus: "hybrid",
              datePosted: "2026-03-30T00:00:00.000Z"
            },
            {
              jobTitle: "",
              companyName: "Broken",
              location: "Hanoi, Vietnam",
              referringURL: "invalid-url",
              jobDescription: "",
              salary: "",
              benefits: "",
              remoteStatus: "remote",
              datePosted: "bad-date"
            }
          ];
        }
      }
    });

    const response = await handler({} as never);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: { insertedCount: number; failed: Array<{ index: number }> };
    };
    expect(body.data.insertedCount).toBe(1);
    expect(body.data.failed).toHaveLength(1);
    expect(receivedQuery).toBe("frontend jobs in hanoi vietnam");
    expect(receivedMaxResults).toBe(50);

    const inserted = await repository.getAllJobs();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.jobId).toBe("generated-id");
  });

  it("returns insertedCount 0 when crawler returns no jobs", async () => {
    const repository = new InMemoryJobRepository();

    const handler = buildInsertJobsHandler({
      repository,
      crawler: {
        crawlJobs: async () => []
      }
    });

    const response = await handler({} as never);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      data: { insertedCount: number; failed: Array<{ index: number; reason: string }> };
    };
    expect(body.data.insertedCount).toBe(0);
    expect(body.data.failed).toEqual([]);

    const inserted = await repository.getAllJobs();
    expect(inserted).toHaveLength(0);
  });

  it("returns 500 when crawl fails", async () => {
    const repository = new InMemoryJobRepository();

    const handler = buildInsertJobsHandler({
      repository,
      crawler: {
        crawlJobs: async () => {
          throw new Error("Gemini unavailable");
        }
      }
    });

    const response = await handler({} as never);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INSERT_FAILED");
    expect(body.error.message).toContain("Gemini unavailable");
  });
});

