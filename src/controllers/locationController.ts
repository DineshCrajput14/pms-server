import { Request, Response } from "express";
import {
  getCountries,
  getStatesByCountryId,
  getCitiesByStateId,
  getAllCities,
  getCityById,
  createCity,
  updateCity,
  deleteCity,
  checkCityInUse,
} from "../models/locationModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getCountriesList(req: Request, res: Response) {
  try {
    const countries = await getCountries();
    return res.status(HTTP_STATUS.OK).json({ countries });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch countries",
      error.message,
    );
  }
}

export async function getCountryStatesList(req: Request, res: Response) {
  try {
    const countryId = parseInt(req.params.countryId ?? req.params.id, 10);
    if (isNaN(countryId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Country ID");
    }
    const states = await getStatesByCountryId(countryId);
    return res.status(HTTP_STATUS.OK).json({ states });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch states",
      error.message,
    );
  }
}

export async function getStateCitiesList(req: Request, res: Response) {
  try {
    const stateId = parseInt(req.params.stateId ?? req.params.id, 10);
    if (isNaN(stateId)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid State ID");
    }
    const cities = await getCitiesByStateId(stateId);
    return res.status(HTTP_STATUS.OK).json({ cities });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch cities for state",
      error.message,
    );
  }
}

export async function getCitiesList(req: Request, res: Response) {
  try {
    const cities = await getAllCities();
    return res.status(HTTP_STATUS.OK).json({ cities });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch cities",
      error.message,
    );
  }
}

export async function getCityDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid City ID");
    }
    const city = await getCityById(id);
    if (!city) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "City not found");
    }
    return res.status(HTTP_STATUS.OK).json({ city, ...city });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch city detail",
      error.message,
    );
  }
}

export async function createNewCity(req: Request, res: Response) {
  try {
    const { name, stateId, state } = req.body;
    const targetStateId = stateId ?? state?.id;
    if (!name || !targetStateId) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "City name and stateId are required",
      );
    }
    const cityId = await createCity(targetStateId, name);
    return res
      .status(HTTP_STATUS.CREATED)
      .json({ id: cityId, name, stateId: targetStateId });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create city",
      error.message,
    );
  }
}

export async function editCity(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, stateId, state } = req.body;
    const targetStateId = stateId ?? state?.id;

    if (isNaN(id) || !name) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "City ID and name are required",
      );
    }

    const success = await updateCity(id, name, targetStateId);
    if (!success) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "City not found or unchanged",
      );
    }
    return res
      .status(HTTP_STATUS.OK)
      .json({ id, name, stateId: targetStateId });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update city",
      error.message,
    );
  }
}

export async function removeCity(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid City ID");
    }

    const usageCheck = await checkCityInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This city is in use. Cannot be deleted.",
      );
    }

    const success = await deleteCity(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "City not found");
    }
    return res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: "City deleted successfully" });
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
        "This city is in use. Cannot be deleted.",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete city",
      error.message,
    );
  }
}
