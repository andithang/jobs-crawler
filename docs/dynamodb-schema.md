# DynamoDB Schema

## Table

- Table name: `JobListings`
- Partition key: `jobId` (String)
- Sort key: `datePosted` (String, ISO 8601)
- Billing mode: `PAY_PER_REQUEST`

## Attributes

- `jobId`
- `jobTitle`
- `companyName`
- `location`
- `referringURL`
- `jobDescription`
- `salary`
- `benefits`
- `remoteStatus`
- `datePosted`

## Access patterns (current)

- Insert jobs in batch (`BatchWriteItem`).
- Read/search by scanning and applying filters in Lambda.
- Cleanup by scanning and deleting expired keys.

## Notes

This v1 implementation favors correctness and clarity over scan efficiency. For larger volume, add GSIs and move filter logic into key-condition query patterns.
