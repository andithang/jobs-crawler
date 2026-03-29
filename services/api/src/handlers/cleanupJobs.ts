import type { APIGatewayProxyResult, EventBridgeEvent } from "aws-lambda";
import type { JobRepository } from "../lib/repository";
import { DynamoDbJobRepository } from "../lib/dynamodbRepository";
import { failure, success } from "../lib/http";
import { selectExpiredJobs } from "../lib/cleanup";

interface Dependencies {
  repository: JobRepository;
  now: () => Date;
}

export function buildCleanupJobsHandler(deps?: Partial<Dependencies>) {
  const repository = deps?.repository ?? new DynamoDbJobRepository();
  const now = deps?.now ?? (() => new Date());

  return async (_event: EventBridgeEvent<string, unknown>): Promise<APIGatewayProxyResult> => {
    try {
      const jobs = await repository.getAllJobs();
      const expired = selectExpiredJobs(jobs, now());

      const deletedCount = await repository.deleteJobs(
        expired.map((job) => ({
          jobId: job.jobId,
          datePosted: job.datePosted
        }))
      );

      return success(200, {
        deletedCount
      });
    } catch (error) {
      return failure(500, "CLEANUP_FAILED", (error as Error).message);
    }
  };
}

export const handler = buildCleanupJobsHandler();

