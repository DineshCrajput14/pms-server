import { Response } from "express";

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string = "",
  data?: T,
) {
  const response: any = {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined && { data }),
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  error?: any,
) {
  const finalMessage =
    typeof error === "string" &&
    error.trim() &&
    message.toLowerCase().startsWith("failed to")
      ? error
      : message;

  return res.status(statusCode).json({
    message: finalMessage,
  });
}
