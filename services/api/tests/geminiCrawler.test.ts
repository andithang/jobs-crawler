import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiJobCrawler } from "../src/lib/geminiCrawler";

describe("GeminiJobCrawler", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  it("parses jobs when Gemini wraps JSON in markdown fences", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text:
                    "I found jobs.\n```json\n" +
                    '{"jobs":[{"jobTitle":"Backend Engineer","companyName":"Acme","location":"Remote","referringURL":"https://jobs.example.com/1","jobDescription":"Build APIs","salary":"Not specified","benefits":"Not specified","remoteStatus":"remote","datePosted":"2026-03-20T00:00:00.000Z"}]}' +
                    "\n```"
                }
              ]
            }
          }
        ]
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const crawler = new GeminiJobCrawler();
    const jobs = await crawler.crawlJobs({ crawlQuery: "backend engineer" });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.jobTitle).toBe("Backend Engineer");
  });

  it("throws a clear error when Gemini does not return JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "I need a more specific query before I can continue." }]
            }
          }
        ]
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const crawler = new GeminiJobCrawler();

    await expect(crawler.crawlJobs({ crawlQuery: "backend engineer" })).rejects.toThrow(
      "Gemini response was not valid JSON with a top-level jobs array."
    );
  });
});

