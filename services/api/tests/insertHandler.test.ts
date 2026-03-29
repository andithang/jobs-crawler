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
});

