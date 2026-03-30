import { describe, expect, it, vi } from "vitest";
import { buildJobsQueryString, fetchJobsFromApi, insertJobsFromApi } from "../src/lib/jobsClient";

describe("buildJobsQueryString", () => {
  it("serializes non-empty filters", () => {
    const query = buildJobsQueryString({
      jobTitle: " Engineer ",
      companyName: "Acme",
      remoteStatus: "remote"
    });

    expect(query).toBe("jobTitle=Engineer&companyName=Acme&remoteStatus=remote");
  });
});

describe("fetchJobsFromApi", () => {
  it("calls backend without API key header for public GET endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          items: [],
          totalCount: 0
        }
      })
    });

    const result = await fetchJobsFromApi(
      {
        jobTitle: "node"
      },
      {
        apiBaseUrl: "https://api.example.com/dev",
        fetchImpl: fetchMock
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/dev/jobs?jobTitle=node",
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json"
        })
      })
    );
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty("x-api-key");
    expect(result.items).toEqual([]);
  });
});

describe("insertJobsFromApi", () => {
  it("calls backend with x-api-key and crawlQuery payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          insertedCount: 3,
          failed: []
        }
      })
    });

    const result = await insertJobsFromApi("backend engineer remote", {
      apiBaseUrl: "https://api.example.com/dev",
      apiKey: "secret-key",
      fetchImpl: fetchMock
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/dev/jobs",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": "secret-key"
        })
      })
    );
    expect(result.insertedCount).toBe(3);
  });
});
