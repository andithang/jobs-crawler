# Lambda Functions

## `insertJobs`

- Trigger: `POST /jobs`
- Responsibilities:
  - Parse request JSON.
  - Validate each job payload.
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

- Trigger: CloudWatch/EventBridge schedule `rate(1 day)`
- Responsibilities:
  - Load all jobs.
  - Select entries older than 7 days.
  - Batch delete expired jobs.
  - Return `deletedCount`.
