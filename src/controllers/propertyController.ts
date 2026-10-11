import { Request, Response } from "express";
import {
  getAllProperties,
  getPropertyById,
  checkDuplicatePropertyName,
  checkPropertyInUse,
  createProperty,
  updateProperty,
  deleteProperty,
} from "../models/propertyModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getPropertiesList(req: Request, res: Response) {
  try {
    const properties = await getAllProperties();
    return res.status(HTTP_STATUS.OK).json({ properties });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch properties",
      error.message,
    );
  }
}

export async function getPropertyDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Property ID");
    }
    const property = await getPropertyById(id);
    if (!property) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Property not found");
    }
    return res.status(HTTP_STATUS.OK).json({ property, ...property });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch property detail",
      error.message,
    );
  }
}

export async function createNewProperty(req: Request, res: Response) {
  try {
    const {
      name,
      address,
      countryId,
      stateId,
      cityId,
      ownerName,
      description,
    } = req.body;

    if (!name || !name.trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Property name is required",
      );
    }
    if (!ownerName || !ownerName.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Owner name is required");
    }

    const trimmedName = name.trim();
    const isDuplicate = await checkDuplicatePropertyName(trimmedName);
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Property "${trimmedName}" already exists`,
      );
    }

    const propertyId = await createProperty({
      name: trimmedName,
      address: address ? address.trim() : null,
      countryId: countryId ? parseInt(countryId, 10) : undefined,
      stateId: stateId ? parseInt(stateId, 10) : undefined,
      cityId: cityId ? parseInt(cityId, 10) : undefined,
      ownerName: ownerName.trim(),
      description: description ? description.trim() : null,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Property Created Successfully",
      id: propertyId,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create property",
      error.message,
    );
  }
}

export async function editProperty(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Property ID");
    }

    const {
      name,
      address,
      countryId,
      stateId,
      cityId,
      ownerName,
      description,
    } = req.body;

    if (!name || !name.trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Property name is required",
      );
    }
    if (!ownerName || !ownerName.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Owner name is required");
    }

    const trimmedName = name.trim();
    const isDuplicate = await checkDuplicatePropertyName(trimmedName, id);
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Property "${trimmedName}" already exists`,
      );
    }

    const success = await updateProperty(id, {
      name: trimmedName,
      address: address ? address.trim() : null,
      countryId: countryId ? parseInt(countryId, 10) : undefined,
      stateId: stateId ? parseInt(stateId, 10) : undefined,
      cityId: cityId ? parseInt(cityId, 10) : undefined,
      ownerName: ownerName.trim(),
      description: description ? description.trim() : null,
    });

    if (!success) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Property not found or unchanged",
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Property Updated Successfully",
      id,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update property",
      error.message,
    );
  }
}

export async function removeProperty(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Property ID");
    }

    const usageCheck = await checkPropertyInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This property is in use. Cannot be deleted.",
      );
    }

    const success = await deleteProperty(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Property not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Property Deleted Successfully",
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
        "This property is in use. Cannot be deleted.",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete property",
      error.message,
    );
  }
}
