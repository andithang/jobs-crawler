import type { APIGatewayProxyResult } from "aws-lambda";
import type { ApiError, ApiSuccess } from "@jobs-crawler/shared";

const defaultHeaders = {
  "content-type": "application/json",
  "access-control-allow-origin": "*"
};

export function success<T>(statusCode: number, data: T): APIGatewayProxyResult {
  const body: ApiSuccess<T> = {
    success: true,
    data
  };

  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body)
  };
}

export function failure(statusCode: number, code: string, message: string, details?: unknown): APIGatewayProxyResult {
  const body: ApiError = {
    success: false,
    error: {
      code,
      message,
      details
    }
  };

  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body)
  };
}

