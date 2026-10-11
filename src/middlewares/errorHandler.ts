import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { sendError } from "../utils/apiResponse";
import { env } from "../config/env.config";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.message);
  }

  const statusCode = err.status || 500;
  const message = statusCode === 500 ? "Internal Server Error" : err.message;
  return sendError(
    res,
    statusCode,
    message,
    env.NODE_ENV === "development" ? err.stack : undefined,
  );
}
