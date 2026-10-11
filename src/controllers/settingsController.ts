import { Request, Response } from "express";
import {
  getControlPanelSettings,
  saveControlPanelSettings,
} from "../models/settingsModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getControlPanel(req: Request, res: Response) {
  try {
    const settings = await getControlPanelSettings();
    return res.status(HTTP_STATUS.OK).json(settings);
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch control panel settings",
      error.message,
    );
  }
}

export async function saveControlPanel(req: Request, res: Response) {
  try {
    const { tenantRegistrationNumberAuto, nextNumberTenant } = req.body;

    const success = await saveControlPanelSettings({
      tenantRegistrationNumberAuto: Boolean(tenantRegistrationNumberAuto),
      nextNumberTenant,
    });

    if (!success) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Failed to save control panel settings",
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Settings saved successfully",
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to save control panel settings",
      error.message,
    );
  }
}
