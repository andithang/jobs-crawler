# Jobs Crawler

A statically exported Next.js job board (Tailwind CSS) backed by AWS API Gateway + Lambda + DynamoDB.

## Overview

Jobs are stored in DynamoDB and served through API Gateway-protected Lambda functions. The web app is exported as static files for GitHub Pages and fetches jobs client-side from the public `GET /jobs` endpoint.

## Architecture

- `apps/web`: Next.js static-export frontend with Tailwind CSS.
- `services/api`: Serverless Framework service with Lambda handlers.
- `packages/shared`: Shared TypeScript types used by frontend and backend.

Data flow:
1. User loads static site from GitHub Pages.
2. Browser calls API Gateway `GET /jobs` (public read endpoint).
3. Lambda queries DynamoDB `JobListings` and returns results.
4. Protected `POST /jobs` remains API-key authenticated for inserts.

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
| `NEXT_PUBLIC_JOBS_API_BASE_URL` | Yes | Web | Public API base URL used by static web app |
| `NEXT_PUBLIC_APP_NAME` | Optional | Web | UI label/environment branding |
| `AWS_REGION` | Yes | API | AWS region for Lambda + DynamoDB |
| `JOBS_TABLE_NAME` | Yes | API | DynamoDB table name (default `JobListings`) |
| `CORS_ALLOW_ORIGIN` | Yes | API | Allowed browser origin for CORS (set to custom domain) |
| `AWS_ACCESS_KEY_ID` | Yes (for local/deploy) | API | AWS auth for local CLI/deploy |
| `AWS_SECRET_ACCESS_KEY` | Yes (for local/deploy) | API | AWS auth for local CLI/deploy |
| `AWS_SESSION_TOKEN` | Optional | API | Temporary credentials support |
| `SERVERLESS_ACCESS_KEY` | Yes (deploy) | API | Serverless Framework v4 authentication |

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

- Auth: public (no API key).
- CORS: allows `https://jobs-crawler.andithang.org`.
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

Build web static export:

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

3. `Deploy Next.js to Pages` (`.github/workflows/nextjs.yml`)
- Triggers only after successful `CI` on `main`.
- Builds static export from `apps/web/out` using `NEXT_PUBLIC_JOBS_API_BASE_URL`.
- Deploys artifact to GitHub Pages.

### Required GitHub configuration

- Repository secret: `AWS_ROLE_TO_ASSUME` (IAM role ARN)
- Repository secret: `AWS_REGION` (for example `ap-southeast-1`)
- Repository secret: `SERVERLESS_ACCESS_KEY` (Serverless Framework access key)
- Repository variable: `NEXT_PUBLIC_JOBS_API_BASE_URL`

### AWS OIDC trust requirements

Configure the IAM role trust policy for GitHub OIDC with:

- Audience: `sts.amazonaws.com`
- Subject: `repo:andithang/jobs-crawler:ref:refs/heads/main`

## GitHub Pages Custom Domain

- Domain: `jobs-crawler.andithang.org`
- DNS target: `andithang.github.io`
- `apps/web/public/CNAME` is included in exported artifact.

## Security and Rate Limiting

- `POST /jobs` remains private and requires API key.
- Usage plan quota is configured to `10 requests/day`.
- `GET /jobs` is public read-only for static web access.

## Docs Index

- [API Reference](./docs/api-reference.md)
- [Lambda Functions](./docs/lambda-functions.md)
- [DynamoDB Schema](./docs/dynamodb-schema.md)
- [Operations Runbook](./docs/operations-runbook.md)
