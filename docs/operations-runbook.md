# Operations Runbook

## Deploy

```bash
npm install
npm run deploy -w @jobs-crawler/api
npm run build -w @jobs-crawler/web
```

## Verify APIs

1. Get API key from API Gateway stage/usage plan.
2. Run `POST /jobs` with sample data.
3. Run `GET /jobs` with and without filters.
4. Confirm quota behavior (`10/day`) in API Gateway usage metrics.

## Cleanup job verification

1. Insert records older than 7 days.
2. Invoke `cleanupJobs` manually from Lambda console.
3. Confirm old records are removed from DynamoDB.

## Rollback

```bash
npm run remove -w @jobs-crawler/api
```

Then redeploy from last known-good commit.

## Monitoring recommendations

- Enable CloudWatch alarms for Lambda errors and throttles.
- Track API Gateway `4xx`, `5xx`, and usage-plan quota metrics.
- Add structured logging around request IDs and filter inputs for incident troubleshooting.
