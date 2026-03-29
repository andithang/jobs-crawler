# Jobs Crawler

An SSR Next.js job board backed by AWS API Gateway + Lambda + DynamoDB.

## Overview

Jobs are stored in DynamoDB and served through API Gateway-protected Lambda functions. The web app renders server-side and supports filtering by title, location, company, remote status, referring URL, and date posted.

## Architecture

- `apps/web`: Next.js SSR frontend with Tailwind CSS.
- `services/api`: Serverless Framework service with Lambda handlers.
- `packages/shared`: Shared TypeScript types used by frontend and backend.

Data flow:
1. User requests the SSR page in `apps/web`.
2. Server-side code calls API Gateway `/jobs` with `x-api-key`.
3. Lambda reads/writes DynamoDB table `JobListings`.
4. UI renders DB-backed results responsively.

## Project Structure

```text
jobs-crawler/
├─ apps/
│  └─ web/
├─ services/
│  └─ api/
├─ packages/
│  └─ shared/
└─ docs/
```

## Setup

### 1. Prerequisites

- Node.js 20+
- npm 10+
- AWS account + IAM credentials with DynamoDB/API Gateway/Lambda permissions
- Serverless Framework CLI (installed as workspace dependency)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy values from `.env.example` into your local `.env` (or shell environment).

### 4. Run tests

```bash
npm run test
```

### 5. Run locally

Terminal A (API):

```bash
npm run dev:api
```

Terminal B (Web):

```bash
npm run dev:web
```

## Environment Variables

| Variable | Required | Used by | Purpose |
| --- | --- | --- | --- |
| `AWS_REGION` | Yes | API | AWS region for Lambda + DynamoDB |
| `JOBS_TABLE_NAME` | Yes | API | DynamoDB table name (default `JobListings`) |
| `AWS_ACCESS_KEY_ID` | Yes (for local/deploy) | API | AWS auth for local CLI/deploy |
| `AWS_SECRET_ACCESS_KEY` | Yes (for local/deploy) | API | AWS auth for local CLI/deploy |
| `AWS_SESSION_TOKEN` | Optional | API | Temporary credentials support |
| `JOBS_API_BASE_URL` | Yes | Web | Base URL for deployed API Gateway stage |
| `JOBS_API_KEY` | Yes | Web | API Gateway key used only on server-side |
| `NEXT_PUBLIC_APP_NAME` | Optional | Web | UI label/environment branding |

## API Contract

Base path: `/<stage>/jobs`

### `POST /jobs`

- Auth: `x-api-key` required.
- Body:

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

- Response includes `insertedCount` and `failed` entries by index.

### `GET /jobs`

- Auth: `x-api-key` required.
- Query params:
  - `jobTitle`, `location`, `companyName`, `referringURL`: case-insensitive contains match.
  - `remoteStatus`: exact (`remote` | `offline` | `hybrid`).
  - `datePosted`: exact ISO string or `YYYY-MM-DD` date-only filter.
  - `limit` (optional, 1-100), `cursor` (optional pagination cursor).

## Deployment

Deploy API (creates DynamoDB, API Gateway, Lambdas, usage plan, and API key):

```bash
npm run deploy -w @jobs-crawler/api
```

Remove stack:

```bash
npm run remove -w @jobs-crawler/api
```

Build web app:

```bash
npm run build -w @jobs-crawler/web
```

## CI/CD (GitHub Actions)

This repository uses three workflows on `main`:

1. `CI` (`.github/workflows/ci.yml`)
- Runs on pull requests to `main` and direct pushes to `main`.
- Executes `npm ci`, `npm run lint`, `npm run test`, and `npm run build`.

2. `Deploy API` (`.github/workflows/deploy-api.yml`)
- Triggers only after `CI` completes.
- Runs only when the source event is a successful `push` to `main`.
- Checks out `github.event.workflow_run.head_sha` so deploy always matches the exact CI-validated commit.
- Deploys `services/api` to the `prod` stage via Serverless.

3. `Next.js (Web)` (`.github/workflows/nextjs.yml`)
- Runs on pushes and pull requests to `main` when `apps/web` or `packages/shared` changes.
- Executes web-specific checks: lint, test, and build for `@jobs-crawler/web`.

### Required GitHub configuration

- Repository secret: `AWS_ROLE_TO_ASSUME` (IAM role ARN)
- Repository secret: `AWS_REGION` (for example `us-east-1`)
- Repository secret: `SERVERLESS_ACCESS_KEY` (Serverless Framework access key)

### AWS OIDC trust requirements

Configure the IAM role trust policy for GitHub OIDC with:

- Audience: `sts.amazonaws.com`
- Subject: `repo:andithang/jobs-crawler:ref:refs/heads/main`

Example trust-policy condition values:

```json
{
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
  },
  "StringLike": {
    "token.actions.githubusercontent.com:sub": "repo:andithang/jobs-crawler:ref:refs/heads/main"
  }
}
```

## Security and Rate Limiting

- Both `/jobs` endpoints are private and require API key.
- Usage plan quota is configured to `10 requests/day`.
- Frontend keeps the API key server-side (`getServerSideProps` and API proxy route).

## Docs Index

- [API Reference](./docs/api-reference.md)
- [Lambda Functions](./docs/lambda-functions.md)
- [DynamoDB Schema](./docs/dynamodb-schema.md)
- [Operations Runbook](./docs/operations-runbook.md)
