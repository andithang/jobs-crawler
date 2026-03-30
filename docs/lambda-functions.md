# Lambda Functions

## `insertJobs`

- Trigger: EventBridge schedule (`08:00 GMT+7` daily)
- Responsibilities:
  - Call Gemini `gemini-2.5-flash-lite` with `web_search` to crawl and format jobs.
  - Validate each crawled job payload.
  - Normalize `remoteStatus` to lowercase enum.
  - Generate `jobId`.
  - Batch insert valid jobs into DynamoDB.
  - Return inserted count + failed item reasons.

## `searchJobs`

- Trigger: `GET /jobs`
- Responsibilities:
  - Parse and normalize filters.
  - Scan table and apply filter logic:
    - Contains/case-insensitive for text fields.
    - Exact match for `remoteStatus`.
    - Exact or date-only match for `datePosted`.
  - Return paginated results with `cursor`.

## `cleanupJobs`

- Trigger: EventBridge schedule (`00:00 GMT+7` daily)
- Responsibilities:
  - Load all jobs.
  - Select entries older than 7 days.
  - Batch delete expired jobs.
  - Return `deletedCount`.
