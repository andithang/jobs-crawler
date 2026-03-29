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
  it("calls backend with API key header", async () => {
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
        apiKey: "secret",
        fetchImpl: fetchMock
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/dev/jobs?jobTitle=node",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-api-key": "secret"
        })
      })
    );
    expect(result.items).toEqual([]);
  });
});

