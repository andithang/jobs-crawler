# API Reference

## Base URL

`https://<api-id>.execute-api.<region>.amazonaws.com/<stage>`

## Authentication

All endpoints require `x-api-key`.

## Endpoints

### POST `/jobs`

Insert a list of jobs into DynamoDB.

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

### GET `/jobs`

Search jobs with filters.

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
