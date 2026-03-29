import { describe, expect, it, vi } from "vitest";
import { buildJobsQueryString, fetchJobsFromApi } from "../src/lib/jobsClient";

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

