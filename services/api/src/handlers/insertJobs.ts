import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import type { JobRecord } from "@jobs-crawler/shared";
import type { JobRepository } from "../lib/repository";
import { DynamoDbJobRepository } from "../lib/dynamodbRepository";
import { failure, success } from "../lib/http";
import { parseInsertRequest } from "../lib/validation";

interface Dependencies {
  repository: JobRepository;
  idGenerator: () => string;
}

function parseBody(body: string | null): unknown {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

export function buildInsertJobsHandler(deps?: Partial<Dependencies>) {
  const repository = deps?.repository ?? new DynamoDbJobRepository();
  const idGenerator = deps?.idGenerator ?? uuidv4;

  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const payload = parseBody(event.body ?? null);
      const { validJobs, failed } = parseInsertRequest(payload);

      const records: JobRecord[] = validJobs.map((job) => ({
        ...job,
        jobId: idGenerator()
      }));

      await repository.putJobs(records);

      return success(200, {
        insertedCount: records.length,
        failed
      });
    } catch (error) {
      return failure(400, "INVALID_REQUEST", (error as Error).message);
    }
  };
}

export const handler = buildInsertJobsHandler();

