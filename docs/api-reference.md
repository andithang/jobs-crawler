# API Reference

## Base URL

`https://<api-id>.execute-api.<region>.amazonaws.com/<stage>`

## Authentication

- `GET /jobs`: public read endpoint (no API key)
- Job insertion is schedule-only via EventBridge (`insertJobs` Lambda), not exposed as HTTP.

## Endpoints

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
    "code": "SEARCH_FAILED",
    "message": "..."
  }
}
```

