import { Request, Response } from "express";
import { getDashboardSummary } from "../models/dashboardModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getDashboardSummaryController(
  req: Request,
  res: Response,
) {
  try {
    const summary = await getDashboardSummary();
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch dashboard summary",
      error.message,
    );
  }
}
