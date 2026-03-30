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

  it("uses default maxResults of 50 when not provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"jobs":[]}' }]
            }
          }
        ]
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const crawler = new GeminiJobCrawler();
    await crawler.crawlJobs({ crawlQuery: "backend engineer" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(String(init.body)) as {
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    const prompt = requestBody.contents[0]?.parts[0]?.text ?? "";

    expect(prompt).toContain("Return up to 50 jobs.");
  });

  it("parses jobs from escaped JSON in candidates.content.parts.text style output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text:
                    'candidates.content.parts.text: "{\\"jobs\\":[{\\"jobTitle\\":\\"Data Engineer\\",' +
                    '\\"companyName\\":\\"Acme\\",\\"location\\":\\"Remote\\",\\"referringURL\\":\\"https://jobs.example.com/2\\",' +
                    '\\"jobDescription\\":\\"Build data systems\\",\\"salary\\":\\"Not specified\\",' +
                    '\\"benefits\\":\\"Not specified\\",\\"remoteStatus\\":\\"remote\\",' +
                    '\\"datePosted\\":\\"2026-03-20T00:00:00.000Z\\"}]}"'
                }
              ]
            }
          }
        ]
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const crawler = new GeminiJobCrawler();
    const jobs = await crawler.crawlJobs({ crawlQuery: "data engineer" });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.jobTitle).toBe("Data Engineer");
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

  it("retries when Gemini returns invalid text before valid JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "I need more details before I can continue." }] } }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text:
                      '{"jobs":[{"jobTitle":"Retry Engineer","companyName":"Acme","location":"Remote",' +
                      '"referringURL":"https://jobs.example.com/retry-1","jobDescription":"Retry success",' +
                      '"salary":"Not specified","benefits":"Not specified","remoteStatus":"remote",' +
                      '"datePosted":"2026-03-20T00:00:00.000Z"}]}'
                  }
                ]
              }
            }
          ]
        })
      });

    vi.stubGlobal("fetch", fetchMock);

    const crawler = new GeminiJobCrawler();
    const jobs = await crawler.crawlJobs({ crawlQuery: "retry engineer" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.jobTitle).toBe("Retry Engineer");
  });

  it("fails after max attempts when Gemini keeps returning invalid text", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "candidates.content.parts.text: \"...\"" }] } }]
        })
      });

    vi.stubGlobal("fetch", fetchMock);

    const crawler = new GeminiJobCrawler();

    await expect(crawler.crawlJobs({ crawlQuery: "never valid" })).rejects.toThrow(
      "Gemini produced invalid JSON output after 3 attempts."
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
