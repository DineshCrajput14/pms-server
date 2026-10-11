import { Request, Response } from "express";
import {
  getAllReleaseRooms,
  getReleaseRoomById,
  createReleaseRoom,
  updateReleaseRoom,
  deleteReleaseRoom,
  getTenantDetailForReleaseRoom,
} from "../models/releaseRoomModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getReleaseRoomsList(req: Request, res: Response) {
  try {
    const {
      tenantId,
      allotmentId,
      propertyId,
      buildingId,
      unitId,
      fromDate,
      toDate,
      searchField,
      keyword,
    } = req.query;

    const releaseRooms = await getAllReleaseRooms({
      tenantId: tenantId ? String(tenantId) : undefined,
      allotmentId: allotmentId ? String(allotmentId) : undefined,
      propertyId: propertyId ? String(propertyId) : undefined,
      buildingId: buildingId ? String(buildingId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      searchField: searchField ? String(searchField) : undefined,
      keyword: keyword ? String(keyword) : undefined,
    });

    return res.status(HTTP_STATUS.OK).json({
      releaseRooms,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch release rooms",
      error.message,
    );
  }
}

export async function getReleaseRoomDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Release Room ID");
    }

    const releaseRoom = await getReleaseRoomById(id);
    if (!releaseRoom) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Release Room not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      releaseRoom,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch release room detail",
      error.message,
    );
  }
}

export async function createNewReleaseRoom(req: Request, res: Response) {
  try {
    const { tenantId, date } = req.body;
    if (!tenantId || !date) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Tenant and Date are required to create a release room record",
      );
    }

    const result = await createReleaseRoom(req.body);
    const createdRecord = await getReleaseRoomById(result.id);

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Release room created successfully",
      id: result.id,
      receiptNo: result.receiptNo,
      releaseRoom: createdRecord,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create release room",
      error.message,
    );
  }
}

export async function updateExistingReleaseRoom(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Release Room ID");
    }

    const existing = await getReleaseRoomById(id);
    if (!existing) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Release Room not found");
    }

    if (existing.isReleaseDate && existing.releaseDate) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (todayStr > existing.releaseDate) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Cannot edit release room: the release date (${existing.releaseDate}) has already passed.`,
        );
      }
    }

    await updateReleaseRoom(id, req.body);
    const updatedRecord = await getReleaseRoomById(id);

    return res.status(HTTP_STATUS.OK).json({
      message: "Release room updated successfully",
      id,
      releaseRoom: updatedRecord,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update release room",
      error.message,
    );
  }
}

export async function removeReleaseRoom(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Release Room ID");
    }

    const existing = await getReleaseRoomById(id);
    if (!existing) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Release Room not found");
    }

    await deleteReleaseRoom(id);

    return res.status(HTTP_STATUS.OK).json({
      message: "Release room deleted successfully",
      id,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete release room",
      error.message,
    );
  }
}

export async function getTenantDetailForReleaseRoomController(
  req: Request,
  res: Response,
) {
  try {
    const regNo =
      req.query.registrationNumber || req.query.regNo || req.params.regNo;
    const receiptDate =
      req.query.receiptDate || req.query.date
        ? String(req.query.receiptDate || req.query.date)
        : undefined;
    const deleteDues = String(req.query.deleteDues).toLowerCase() === "true";
    const deleteDuesFromDate = req.query.deleteDuesFromDate
      ? String(req.query.deleteDuesFromDate)
      : undefined;

    if (!regNo) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Registration Number is required",
      );
    }

    const result = await getTenantDetailForReleaseRoom(
      String(regNo),
      receiptDate,
      deleteDues,
      deleteDuesFromDate,
    );

    return res.status(HTTP_STATUS.OK).json({
      tenantDetail: result?.tenantDetail ?? null,
      dueRentSummary: result?.dueRentSummary ?? [],
      receiptDetails: result?.receiptDetails ?? [],
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch tenant details for release room",
      error.message,
    );
  }
}
