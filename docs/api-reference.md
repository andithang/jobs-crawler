# API Reference

## Base URL

`https://<api-id>.execute-api.<region>.amazonaws.com/<stage>`

## Authentication

- `POST /jobs`: requires `x-api-key`
- `GET /jobs`: public read endpoint (no API key)

## Endpoints

### POST `/jobs`

Insert jobs into DynamoDB.

The endpoint supports two modes:
- **Direct mode**: submit a `jobs` array.
- **Crawl mode**: omit `jobs`; Lambda will use Gemini `gemini-2.5-flash-lite` + Google Search grounding to crawl and format jobs before inserting using an internal query.

Request body:

```json
{
  "jobs": [
    {
      "jobTitle": "Backend Engineer",
      "companyName": "Acme",
      "location": "Bangkok",
      "referringURL": "https://jobs.example.com/1",
      "jobDescription": "Build APIs",
      "salary": "$100k",
      "benefits": "Health",
      "remoteStatus": "remote",
      "datePosted": "2026-03-20T00:00:00.000Z"
    }
  ]
}
```

Response (`200`):

```json
{
  "success": true,
  "data": {
    "insertedCount": 1,
    "failed": []
  }
}
```

Crawl-mode request example:

```json
{
  "maxResults": 20
}
```

In crawl mode, Lambda uses `DEFAULT_CRAWL_QUERY` (or a built-in default query) so clients do not pass crawl text.

### GET `/jobs`

Search jobs with filters.

CORS origin is restricted to `https://jobs-crawler.andithang.org`.

Supported query params:

- `jobTitle`
- `location`
- `companyName`
- `referringURL`
- `remoteStatus`
- `datePosted`
- `limit`
- `cursor`

Response (`200`):

```json
{
  "success": true,
  "data": {
    "items": [],
    "totalCount": 0,
    "nextCursor": "MQ"
  }
}
```

## Error format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request body must include a non-empty jobs array."
  }
}
```
