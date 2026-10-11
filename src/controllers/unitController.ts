import { Request, Response } from "express";
import {
  getUnitsList,
  getUnitById,
  checkDuplicateUnitNo,
  checkUnitInUse,
  checkUnitStatusEditable,
  createUnit,
  updateUnit,
  deleteUnit,
} from "../models/unitModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getUnitsListHandler(req: Request, res: Response) {
  try {
    const buildingIdStr = req.query.buildingId as string;
    const propertyIdStr = req.query.propertyId as string;

    const buildingId = buildingIdStr ? parseInt(buildingIdStr, 10) : undefined;
    const propertyId = propertyIdStr ? parseInt(propertyIdStr, 10) : undefined;

    const units = await getUnitsList(
      isNaN(buildingId as number) ? undefined : buildingId,
      isNaN(propertyId as number) ? undefined : propertyId,
    );
    return res.status(HTTP_STATUS.OK).json({ units });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch units",
      error.message,
    );
  }
}

export async function getUnitDetailHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Unit ID");
    }
    const unit = await getUnitById(id);
    if (!unit) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Unit not found");
    }
    const statusCheck = await checkUnitStatusEditable(id);
    return res.status(HTTP_STATUS.OK).json({
      unit: {
        ...unit,
        canEditStatus: statusCheck.canEditStatus,
        statusReason: statusCheck.reason,
      },
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch unit detail",
      error.message,
    );
  }
}

export async function createNewUnitHandler(req: Request, res: Response) {
  try {
    const {
      propertyId,
      buildingId,
      floorId,
      unitNo,
      status,
      charges,
      description,
    } = req.body;

    if (!propertyId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Property is required");
    }
    if (!buildingId) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Block/Building is required",
      );
    }
    if (!floorId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Floor is required");
    }
    if (!unitNo || !unitNo.trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Unit No/Name is required",
      );
    }

    const parsedPropertyId = parseInt(propertyId, 10);
    const parsedBuildingId = parseInt(buildingId, 10);
    const parsedFloorId = parseInt(floorId, 10);
    const trimmedUnitNo = unitNo.trim();

    const isDuplicate = await checkDuplicateUnitNo(
      trimmedUnitNo,
      parsedBuildingId,
    );
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Unit "${trimmedUnitNo}" already exists in this block`,
      );
    }

    const unitId = await createUnit({
      propertyId: parsedPropertyId,
      buildingId: parsedBuildingId,
      floorId: parsedFloorId,
      unitNo: trimmedUnitNo,
      status: status ? status.trim() : "Available",
      charges:
        charges !== undefined && charges !== null ? parseFloat(charges) : 0,
      description: description ? description.trim() : null,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Unit Added Successfully",
      id: unitId,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create unit",
      error.message,
    );
  }
}

export async function editUnitHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Unit ID");
    }

    const {
      propertyId,
      buildingId,
      floorId,
      unitNo,
      status,
      charges,
      description,
    } = req.body;

    if (!propertyId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Property is required");
    }
    if (!buildingId) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Block/Building is required",
      );
    }
    if (!floorId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Floor is required");
    }
    if (!unitNo || !unitNo.trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Unit No/Name is required",
      );
    }

    const parsedPropertyId = parseInt(propertyId, 10);
    const parsedBuildingId = parseInt(buildingId, 10);
    const parsedFloorId = parseInt(floorId, 10);
    const trimmedUnitNo = unitNo.trim();

    const isDuplicate = await checkDuplicateUnitNo(
      trimmedUnitNo,
      parsedBuildingId,
      id,
    );
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Unit "${trimmedUnitNo}" already exists in this block`,
      );
    }

    const existingUnit = await getUnitById(id);
    if (!existingUnit) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Unit not found");
    }

    const statusCheck = await checkUnitStatusEditable(id);
    const requestedStatus = status ? status.trim() : existingUnit.status;

    if (requestedStatus !== existingUnit.status && !statusCheck.canEditStatus) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        statusCheck.reason ||
          "This unit is currently in use. Status cannot be changed.",
      );
    }

    const finalStatus = statusCheck.canEditStatus
      ? requestedStatus
      : existingUnit.status;

    const success = await updateUnit(id, {
      propertyId: parsedPropertyId,
      buildingId: parsedBuildingId,
      floorId: parsedFloorId,
      unitNo: trimmedUnitNo,
      status: finalStatus,
      charges:
        charges !== undefined && charges !== null ? parseFloat(charges) : 0,
      description: description ? description.trim() : null,
    });

    if (!success) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Unit not found or unchanged",
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Unit Updated Successfully",
      id,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update unit",
      error.message,
    );
  }
}

export async function removeUnitHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Unit ID");
    }

    const usageCheck = await checkUnitInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This unit is in use. Cannot be deleted.",
      );
    }

    const success = await deleteUnit(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Unit not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Unit Deleted Successfully",
    });
  } catch (error: any) {
    if (
      error &&
      (error.code === "ER_ROW_IS_REFERENCED" ||
        error.code === "ER_ROW_IS_REFERENCED_2" ||
        error.errno === 1451)
    ) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This unit is in use. Cannot be deleted.",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete unit",
      error.message,
    );
  }
}
