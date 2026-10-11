import { Request, Response } from "express";
import {
  getAmenitiesList,
  getAmenityById,
  checkDuplicateAmenityName,
  checkAmenityInUse,
  createAmenity,
  updateAmenity,
  deleteAmenity,
} from "../models/amenityModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getAmenitiesListHandler(req: Request, res: Response) {
  try {
    const amenities = await getAmenitiesList();
    return res.status(HTTP_STATUS.OK).json({ amenities });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch amenities",
      error.message,
    );
  }
}

export async function getAmenityDetailHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Amenity ID");
    }
    const amenity = await getAmenityById(id);
    if (!amenity) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Amenity not found");
    }
    return res.status(HTTP_STATUS.OK).json({ amenity });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch amenity detail",
      error.message,
    );
  }
}

export async function createNewAmenityHandler(req: Request, res: Response) {
  try {
    const { name, categoryId, type, chargeType, defaultCharges, description } =
      req.body;

    if (!name || !name.trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Amenities Name is required",
      );
    }
    if (!categoryId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Category is required");
    }
    if (!type || !type.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Type is required");
    }
    if (!chargeType || !chargeType.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Charge Type is required");
    }

    const trimmedName = name.trim();
    const parsedCategoryId = parseInt(categoryId, 10);

    const isDuplicate = await checkDuplicateAmenityName(trimmedName);
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Amenity "${trimmedName}" already exists`,
      );
    }

    const amenityId = await createAmenity({
      name: trimmedName,
      categoryId: parsedCategoryId,
      type: type.trim(),
      chargeType: chargeType.trim(),
      defaultCharges:
        defaultCharges !== undefined && defaultCharges !== null
          ? parseFloat(defaultCharges)
          : 0,
      description: description ? description.trim() : null,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Amenity Added Successfully",
      id: amenityId,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create amenity",
      error.message,
    );
  }
}

export async function editAmenityHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Amenity ID");
    }

    const { name, categoryId, type, chargeType, defaultCharges, description } =
      req.body;

    if (!name || !name.trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Amenities Name is required",
      );
    }
    if (!categoryId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Category is required");
    }
    if (!type || !type.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Type is required");
    }
    if (!chargeType || !chargeType.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Charge Type is required");
    }

    const trimmedName = name.trim();
    const parsedCategoryId = parseInt(categoryId, 10);

    const isDuplicate = await checkDuplicateAmenityName(trimmedName, id);
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Amenity "${trimmedName}" already exists`,
      );
    }

    const success = await updateAmenity(id, {
      name: trimmedName,
      categoryId: parsedCategoryId,
      type: type.trim(),
      chargeType: chargeType.trim(),
      defaultCharges:
        defaultCharges !== undefined && defaultCharges !== null
          ? parseFloat(defaultCharges)
          : 0,
      description: description ? description.trim() : null,
    });

    if (!success) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Amenity not found or unchanged",
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Amenity Updated Successfully",
      id,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update amenity",
      error.message,
    );
  }
}

export async function removeAmenityHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Amenity ID");
    }

    const usageCheck = await checkAmenityInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This amenity is in use. Cannot be deleted.",
      );
    }

    const success = await deleteAmenity(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Amenity not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Amenity Deleted Successfully",
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
        "This amenity is in use. Cannot be deleted.",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete amenity",
      error.message,
    );
  }
}
