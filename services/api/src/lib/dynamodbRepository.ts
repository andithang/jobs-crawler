import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { JobRecord, JobSearchFilters, PaginatedJobs } from "@jobs-crawler/shared";
import type { JobRepository } from "./repository";
import { applySearchFilters } from "./filtering";

const TABLE_NAME = process.env.JOBS_TABLE_NAME ?? "JobListings";
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function parseOffsetCursor(cursor?: string): number {
  if (!cursor) {
    return 0;
  }

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const offset = Number.parseInt(decoded, 10);
    return Number.isFinite(offset) && offset >= 0 ? offset : 0;
  } catch {
    return 0;
  }
}

function createOffsetCursor(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

async function scanAllItems(): Promise<JobRecord[]> {
  const items: JobRecord[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const response = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: exclusiveStartKey
      })
    );

    if (response.Items) {
      items.push(...(response.Items as JobRecord[]));
    }

    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

async function batchWrite(requestItems: JobRecord[]): Promise<void> {
  for (let i = 0; i < requestItems.length; i += 25) {
    const chunk = requestItems.slice(i, i + 25);

    await dynamoClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((item) => ({
            PutRequest: {
              Item: item
            }
          }))
        }
      })
    );
  }
}

async function batchDelete(jobKeys: Array<{ jobId: string; datePosted: string }>): Promise<number> {
  let deleted = 0;

  for (let i = 0; i < jobKeys.length; i += 25) {
    const chunk = jobKeys.slice(i, i + 25);

    await dynamoClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((key) => ({
            DeleteRequest: {
              Key: key
            }
          }))
        }
      })
    );

    deleted += chunk.length;
  }

  return deleted;
}

export class DynamoDbJobRepository implements JobRepository {
  async putJobs(jobs: JobRecord[]): Promise<void> {
    if (jobs.length === 0) {
      return;
    }

    await batchWrite(jobs);
  }

  async searchJobs(filters: JobSearchFilters, limit: number, cursor?: string): Promise<PaginatedJobs> {
    const allJobs = await scanAllItems();
    const sorted = allJobs.sort((a, b) => b.datePosted.localeCompare(a.datePosted));
    const filtered = applySearchFilters(sorted, filters);

    const offset = parseOffsetCursor(cursor);
    const items = filtered.slice(offset, offset + limit);
    const nextOffset = offset + items.length;

    return {
      items,
      totalCount: filtered.length,
      nextCursor: nextOffset < filtered.length ? createOffsetCursor(nextOffset) : undefined
    };
  }

  async getAllJobs(): Promise<JobRecord[]> {
    return scanAllItems();
  }

  async deleteJobs(jobKeys: Array<{ jobId: string; datePosted: string }>): Promise<number> {
    if (jobKeys.length === 0) {
      return 0;
    }

    return batchDelete(jobKeys);
  }
}

