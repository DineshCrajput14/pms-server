import { Request, Response } from "express";
import {
  getPropertyTypesList,
  getBuildingsList,
  getBuildingById,
  checkDuplicateBuildingName,
  checkBuildingInUse,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} from "../models/buildingModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getPropertyTypesListHandler(req: Request, res: Response) {
  try {
    const propertyTypes = await getPropertyTypesList();
    return res.status(HTTP_STATUS.OK).json({ propertyTypes });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch property types",
      error.message,
    );
  }
}

export async function getBuildingsListHandler(req: Request, res: Response) {
  try {
    const propertyIdStr = req.query.propertyId as string;
    const propertyId = propertyIdStr ? parseInt(propertyIdStr, 10) : undefined;
    const buildings = await getBuildingsList(
      isNaN(propertyId as number) ? undefined : propertyId,
    );
    return res.status(HTTP_STATUS.OK).json({ buildings });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch buildings",
      error.message,
    );
  }
}

export async function getBuildingDetailHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Building ID");
    }
    const building = await getBuildingById(id);
    if (!building) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Building not found");
    }
    return res.status(HTTP_STATUS.OK).json({ building, ...building });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch building detail",
      error.message,
    );
  }
}

export async function createNewBuildingHandler(req: Request, res: Response) {
  try {
    const { propertyId, name, propertyTypeId, totalFloors, description } =
      req.body;

    if (!propertyId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Property is required");
    }
    if (!name || !name.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Block Name is required");
    }
    if (!propertyTypeId) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Property Type is required",
      );
    }

    const parsedPropertyId = parseInt(propertyId, 10);
    const parsedPropertyTypeId = parseInt(propertyTypeId, 10);
    const trimmedName = name.trim();

    const isDuplicate = await checkDuplicateBuildingName(
      trimmedName,
      parsedPropertyId,
    );
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Building "${trimmedName}" already exists for this property`,
      );
    }

    const buildingId = await createBuilding({
      propertyId: parsedPropertyId,
      name: trimmedName,
      propertyTypeId: parsedPropertyTypeId,
      totalFloors:
        totalFloors !== undefined && totalFloors !== null
          ? parseInt(totalFloors, 10)
          : 0,
      description: description ? description.trim() : null,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Building Created Successfully",
      id: buildingId,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create building",
      error.message,
    );
  }
}

export async function editBuildingHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Building ID");
    }

    const { propertyId, name, propertyTypeId, totalFloors, description } =
      req.body;

    if (!propertyId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Property is required");
    }
    if (!name || !name.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Block Name is required");
    }
    if (!propertyTypeId) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Property Type is required",
      );
    }

    const parsedPropertyId = parseInt(propertyId, 10);
    const parsedPropertyTypeId = parseInt(propertyTypeId, 10);
    const trimmedName = name.trim();

    const isDuplicate = await checkDuplicateBuildingName(
      trimmedName,
      parsedPropertyId,
      id,
    );
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Building "${trimmedName}" already exists for this property`,
      );
    }

    const success = await updateBuilding(id, {
      propertyId: parsedPropertyId,
      name: trimmedName,
      propertyTypeId: parsedPropertyTypeId,
      totalFloors:
        totalFloors !== undefined && totalFloors !== null
          ? parseInt(totalFloors, 10)
          : 0,
      description: description ? description.trim() : null,
    });

    if (!success) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Building not found or unchanged",
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Building Updated Successfully",
      id,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update building",
      error.message,
    );
  }
}

export async function removeBuildingHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Building ID");
    }

    const usageCheck = await checkBuildingInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This building is in use. Cannot be deleted.",
      );
    }

    const success = await deleteBuilding(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Building not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Building Deleted Successfully",
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
        "This building is in use. Cannot be deleted.",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete building",
      error.message,
    );
  }
}
