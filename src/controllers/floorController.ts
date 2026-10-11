import { Request, Response } from "express";
import {
  getFloorsList,
  getFloorById,
  checkDuplicateFloorName,
  checkDuplicateFloorNo,
  checkFloorInUse,
  createFloor,
  updateFloor,
  deleteFloor,
} from "../models/floorModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getFloorsListHandler(req: Request, res: Response) {
  try {
    const floors = await getFloorsList();
    return res.status(HTTP_STATUS.OK).json({ floors });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch floors",
      error.message,
    );
  }
}

export async function getFloorDetailHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Floor ID");
    }
    const floor = await getFloorById(id);
    if (!floor) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Floor not found");
    }
    return res.status(HTTP_STATUS.OK).json({ floor });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch floor detail",
      error.message,
    );
  }
}

export async function createNewFloorHandler(req: Request, res: Response) {
  try {
    const { name, floorNo } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Floor Name is required");
    }
    if (
      floorNo === undefined ||
      floorNo === null ||
      floorNo === "" ||
      isNaN(Number(floorNo))
    ) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Floor No is required");
    }

    const trimmedName = name.trim();
    const parsedFloorNo = parseInt(floorNo, 10);

    const isDuplicateName = await checkDuplicateFloorName(trimmedName);
    if (isDuplicateName) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Floor name "${trimmedName}" already exists`,
      );
    }

    const isDuplicateNo = await checkDuplicateFloorNo(parsedFloorNo);
    if (isDuplicateNo) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Floor number "${parsedFloorNo}" already exists`,
      );
    }

    const floorId = await createFloor({
      name: trimmedName,
      floorNo: parsedFloorNo,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Floor Added Successfully",
      id: floorId,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create floor",
      error.message,
    );
  }
}

export async function editFloorHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Floor ID");
    }

    const { name, floorNo } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Floor Name is required");
    }
    if (
      floorNo === undefined ||
      floorNo === null ||
      floorNo === "" ||
      isNaN(Number(floorNo))
    ) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Floor No is required");
    }

    const trimmedName = name.trim();
    const parsedFloorNo = parseInt(floorNo, 10);

    const isDuplicateName = await checkDuplicateFloorName(trimmedName, id);
    if (isDuplicateName) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Floor name "${trimmedName}" already exists`,
      );
    }

    const isDuplicateNo = await checkDuplicateFloorNo(parsedFloorNo, id);
    if (isDuplicateNo) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Floor number "${parsedFloorNo}" already exists`,
      );
    }

    const success = await updateFloor(id, {
      name: trimmedName,
      floorNo: parsedFloorNo,
    });

    if (!success) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Floor not found or unchanged",
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Floor Updated Successfully",
      id,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update floor",
      error.message,
    );
  }
}

export async function removeFloorHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Floor ID");
    }

    const usageCheck = await checkFloorInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This floor is in use. Cannot be deleted.",
      );
    }

    const success = await deleteFloor(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Floor not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Floor Deleted Successfully",
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
        "This floor is in use. Cannot be deleted.",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete floor",
      error.message,
    );
  }
}
