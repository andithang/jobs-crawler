import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { JobRepository } from "../lib/repository";
import { DynamoDbJobRepository } from "../lib/dynamodbRepository";
import { failure, success } from "../lib/http";
import { parseSearchFilters } from "../lib/validation";

interface Dependencies {
  repository: JobRepository;
}

export function buildSearchJobsHandler(deps?: Partial<Dependencies>) {
  const repository = deps?.repository ?? new DynamoDbJobRepository();

  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const { filters, limit, cursor } = parseSearchFilters(event.queryStringParameters);
      const result = await repository.searchJobs(filters, limit, cursor);

      return success(200, result);
    } catch (error) {
      return failure(500, "SEARCH_FAILED", (error as Error).message);
    }
  };
}

export const handler = buildSearchJobsHandler();

