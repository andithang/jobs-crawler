import type { NextApiRequest, NextApiResponse } from "next";
import { fetchJobsFromApi, normalizeFilterInput } from "../../lib/jobsClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } });
    return;
  }

  const apiBaseUrl = process.env.JOBS_API_BASE_URL;
  const apiKey = process.env.JOBS_API_KEY;

  if (!apiBaseUrl || !apiKey) {
    res
      .status(500)
      .json({ success: false, error: { code: "SERVER_CONFIG_ERROR", message: "Missing backend API configuration." } });
    return;
  }

  try {
    const data = await fetchJobsFromApi(normalizeFilterInput(req.query), {
      apiBaseUrl,
      apiKey
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: { code: "FETCH_FAILED", message: (error as Error).message } });
  }
}

