import { describe, expect, it } from "vitest";
import { buildSearchJobsHandler } from "../src/handlers/searchJobs";
import { InMemoryJobRepository } from "./inMemoryRepository";

describe("GET /jobs handler", () => {
  it("returns filtered results with pagination metadata", async () => {
    const repository = new InMemoryJobRepository();
    await repository.putJobs([
      {
        jobId: "1",
        jobTitle: "Node Engineer",
        companyName: "Acme",
        location: "Bangkok",
        referringURL: "https://jobs.example.com/1",
        jobDescription: "Build APIs",
        salary: "100",
        benefits: "Health",
        remoteStatus: "remote",
        datePosted: "2026-03-20T00:00:00.000Z"
      },
      {
        jobId: "2",
        jobTitle: "Frontend Engineer",
        companyName: "Globex",
        location: "Bangkok",
        referringURL: "https://jobs.example.com/2",
        jobDescription: "Build UIs",
        salary: "90",
        benefits: "Dental",
        remoteStatus: "offline",
        datePosted: "2026-03-19T00:00:00.000Z"
      }
    ]);

    const handler = buildSearchJobsHandler({ repository });

    const response = await handler({
      queryStringParameters: {
        companyName: "acme",
        limit: "1"
      }
    } as never);

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body) as {
      data: { items: Array<{ jobId: string }>; nextCursor?: string; totalCount: number };
    };

    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]?.jobId).toBe("1");
    expect(body.data.totalCount).toBe(1);
    expect(body.data.nextCursor).toBeUndefined();
  });
});

