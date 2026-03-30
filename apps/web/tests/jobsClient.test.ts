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
      "https://api.example.com/dev/jobs?jobTitle=node&limit=100",
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json"
        })
      })
    );
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty("x-api-key");
    expect(result.items).toEqual([]);
  });

  it("follows nextCursor and returns combined items", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            items: [{ jobId: "1" }],
            totalCount: 2,
            nextCursor: "cursor-2"
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            items: [{ jobId: "2" }],
            totalCount: 2
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

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.example.com/dev/jobs?jobTitle=node&limit=100",
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.com/dev/jobs?jobTitle=node&limit=100&cursor=cursor-2",
      expect.any(Object)
    );
    expect(result.items).toHaveLength(2);
    expect(result.totalCount).toBe(2);
  });
});
