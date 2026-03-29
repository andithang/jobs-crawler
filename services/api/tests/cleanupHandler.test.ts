import { describe, expect, it } from "vitest";
import { buildCleanupJobsHandler } from "../src/handlers/cleanupJobs";
import { InMemoryJobRepository } from "./inMemoryRepository";

describe("cleanup handler", () => {
  it("deletes jobs older than seven days", async () => {
    const repository = new InMemoryJobRepository();
    await repository.putJobs([
      {
        jobId: "fresh",
        jobTitle: "Fresh",
        companyName: "Acme",
        location: "Remote",
        referringURL: "https://jobs.example.com/fresh",
        jobDescription: "Fresh role",
        salary: "100",
        benefits: "Health",
        remoteStatus: "remote",
        datePosted: "2026-03-27T00:00:00.000Z"
      },
      {
        jobId: "old",
        jobTitle: "Old",
        companyName: "Acme",
        location: "Remote",
        referringURL: "https://jobs.example.com/old",
        jobDescription: "Old role",
        salary: "100",
        benefits: "Health",
        remoteStatus: "offline",
        datePosted: "2026-03-10T00:00:00.000Z"
      }
    ]);

    const handler = buildCleanupJobsHandler({
      repository,
      now: () => new Date("2026-03-29T00:00:00.000Z")
    });

    const response = await handler({} as never);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body) as { data: { deletedCount: number } };
    expect(body.data.deletedCount).toBe(1);
  });
});

