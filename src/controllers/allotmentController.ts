import { Request, Response } from "express";
import {
  getAllotmentsList,
  getAllotmentById,
  createAllotment,
  updateAllotment,
  checkAllotmentInUse,
  deleteAllotment,
} from "../models/allotmentModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getAllotments(req: Request, res: Response) {
  try {
    const tenantIdParam = req.params.tenantId;
    const { tenantId, propertyId, buildingId, unitId, status } = req.query;

    const allotments = await getAllotmentsList({
      tenantId: tenantIdParam || (tenantId ? String(tenantId) : undefined),
      propertyId: propertyId ? String(propertyId) : undefined,
      buildingId: buildingId ? String(buildingId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
      status: status ? String(status) : undefined,
    });

    return res.status(HTTP_STATUS.OK).json({ allotments });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch allotments",
      error.message,
    );
  }
}

export async function getAllotmentDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Allotment ID");
    }

    const allotment = await getAllotmentById(id);
    if (!allotment) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Allotment not found");
    }

    return res.status(HTTP_STATUS.OK).json({ allotment });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch allotment detail",
      error.message,
    );
  }
}

export async function createNewAllotment(req: Request, res: Response) {
  try {
    const {
      tenantId,
      propertyId,
      buildingId,
      unitId,
      charges,
      securityAmount,
      date,
      allotmentFrom,
      allotmentTo,
      remarks,
      status,
      additionalCharges,
    } = req.body;

    if (!tenantId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Tenant is required");
    }
    if (!propertyId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Property is required");
    }
    if (!buildingId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Building is required");
    }
    if (!unitId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Unit is required");
    }
    if (!date) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Date is required");
    }
    if (!allotmentFrom) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Allotment start date is required",
      );
    }
    if (!allotmentTo) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Allotment end date is required",
      );
    }

    const allotmentId = await createAllotment({
      tenantId: parseInt(tenantId, 10),
      propertyId: parseInt(propertyId, 10),
      buildingId: parseInt(buildingId, 10),
      unitId: parseInt(unitId, 10),
      charges: Number(charges) || 0,
      securityAmount:
        securityAmount !== undefined
          ? Number(securityAmount) || 0
          : Number(charges) || 0,
      date: String(date),
      allotmentFrom: String(allotmentFrom),
      allotmentTo: String(allotmentTo),
      remarks: remarks ? String(remarks).trim() : null,
      status: status || "Active",
      additionalCharges: Array.isArray(additionalCharges)
        ? additionalCharges
        : [],
    });

    const newAllotment = await getAllotmentById(allotmentId);

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Allotment Created",
      id: allotmentId,
      allotment: newAllotment || { id: allotmentId },
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create allotment",
      error.message,
    );
  }
}

export async function editAllotment(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Allotment ID");
    }

    const existing = await getAllotmentById(id);
    if (!existing) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Allotment not found");
    }

    const {
      tenantId,
      propertyId,
      buildingId,
      unitId,
      charges,
      securityAmount,
      date,
      allotmentFrom,
      allotmentTo,
      remarks,
      status,
      additionalCharges,
    } = req.body;

    const resolvedTenantId = tenantId || existing.tenantId;
    if (!resolvedTenantId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Tenant is required");
    }
    const resolvedPropertyId = propertyId || existing.propertyId;
    if (!resolvedPropertyId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Property is required");
    }
    const resolvedBuildingId = buildingId || existing.buildingId;
    if (!resolvedBuildingId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Building is required");
    }
    const resolvedUnitId = unitId || existing.unitId;
    if (!resolvedUnitId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Unit is required");
    }
    const resolvedDate = date || existing.date;
    if (!resolvedDate) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Date is required");
    }
    const resolvedAllotmentFrom = allotmentFrom || existing.allotmentFrom;
    if (!resolvedAllotmentFrom) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Allotment start date is required",
      );
    }
    const resolvedAllotmentTo = allotmentTo || existing.allotmentTo;
    if (!resolvedAllotmentTo) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Allotment end date is required",
      );
    }

    const success = await updateAllotment(id, {
      tenantId: parseInt(resolvedTenantId, 10),
      propertyId: parseInt(resolvedPropertyId, 10),
      buildingId: parseInt(resolvedBuildingId, 10),
      unitId: parseInt(resolvedUnitId, 10),
      charges:
        charges !== undefined
          ? Number(charges) || 0
          : Number(existing.charges) || 0,
      securityAmount:
        securityAmount !== undefined
          ? Number(securityAmount) || 0
          : Number(existing.securityAmount) || 0,
      date: String(resolvedDate),
      allotmentFrom: String(resolvedAllotmentFrom),
      allotmentTo: String(resolvedAllotmentTo),
      remarks:
        remarks !== undefined
          ? remarks
            ? String(remarks).trim()
            : null
          : existing.remarks,
      status: status || existing.status || "Active",
      additionalCharges: Array.isArray(additionalCharges)
        ? additionalCharges
        : undefined,
    });

    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Allotment not found");
    }

    const updated = await getAllotmentById(id);

    return res.status(HTTP_STATUS.OK).json({
      message: "Allotment Updated",
      id,
      allotment: updated || { id },
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update allotment",
      error.message,
    );
  }
}

export async function removeAllotment(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Allotment ID");
    }

    const usageCheck = await checkAllotmentInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This allotment has associated rent receipts. Cannot be deleted.",
      );
    }

    const success = await deleteAllotment(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Allotment not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Allotment Deleted",
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete allotment",
      error.message,
    );
  }
}
