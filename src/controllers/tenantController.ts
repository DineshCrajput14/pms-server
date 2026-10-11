import { Request, Response } from "express";
import {
  getAllTenants,
  getTenantById,
  checkDuplicateRegNo,
  checkTenantInUse,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantLedgerData,
  getTenantSecurityLedgerData,
} from "../models/tenantModel";
import {
  getControlPanelSettings,
  getNextTenantNumberAndIncrement,
} from "../models/settingsModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getTenantsList(req: Request, res: Response) {
  try {
    const {
      propertyId,
      buildingId,
      unitId,
      status,
      searchField,
      searchOptionId,
      keyword,
    } = req.query;

    const actualSearchField =
      searchField || searchOptionId
        ? String(searchField || searchOptionId)
        : undefined;

    const tenants = await getAllTenants({
      propertyId: propertyId ? String(propertyId) : undefined,
      buildingId: buildingId ? String(buildingId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
      status: status ? String(status) : undefined,
      searchField: actualSearchField,
      keyword: keyword ? String(keyword) : undefined,
    });

    return res.status(HTTP_STATUS.OK).json({ tenants });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch tenants",
      error.message,
    );
  }
}

export async function getTenantDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Tenant ID");
    }

    const tenant = await getTenantById(id);
    if (!tenant) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Tenant not found");
    }

    return res.status(HTTP_STATUS.OK).json({ tenant });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch tenant detail",
      error.message,
    );
  }
}

export async function createNewTenant(req: Request, res: Response) {
  try {
    const {
      regNo,
      regDate,
      name,
      address,
      mobileNo,
      countryId,
      stateId,
      cityId,
      identityProof,
      identityProofNumber,
      status,
      inactiveDate,
      nextOfKinName,
      nextOfKinMobileNo,
      nextOfKinAddress,
    } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Tenant name is required");
    }

    const controlSettings = await getControlPanelSettings();
    const isAuto =
      controlSettings.controlPanelSetting.tenantRegistrationNumberAuto;

    let finalRegNo = regNo ? String(regNo).trim() : "";

    if (!finalRegNo) {
      if (isAuto) {
        finalRegNo = await getNextTenantNumberAndIncrement();
      } else {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          "Registration number is required",
        );
      }
    } else {
      const isDuplicate = await checkDuplicateRegNo(finalRegNo);
      if (isDuplicate) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Registration number "${finalRegNo}" already exists`,
        );
      }
      if (isAuto) {
        await getNextTenantNumberAndIncrement(finalRegNo);
      }
    }

    const tenantId = await createTenant({
      regNo: finalRegNo,
      regDate: regDate || new Date().toISOString().split("T")[0],
      name: name.trim(),
      address: address ? address.trim() : null,
      mobileNo:
        mobileNo && String(mobileNo).trim() ? String(mobileNo).trim() : null,
      countryId: countryId ? parseInt(countryId, 10) : null,
      stateId: stateId ? parseInt(stateId, 10) : null,
      cityId: cityId ? parseInt(cityId, 10) : null,
      identityProof: identityProof || "Driving License",
      identityProofNumber: identityProofNumber
        ? identityProofNumber.trim()
        : null,
      status: status || "Active",
      inactiveDate: inactiveDate ? String(inactiveDate).trim() : null,
      nextOfKinName: nextOfKinName ? nextOfKinName.trim() : null,
      nextOfKinMobileNo: nextOfKinMobileNo ? nextOfKinMobileNo.trim() : null,
      nextOfKinAddress: nextOfKinAddress ? nextOfKinAddress.trim() : null,
    });

    const newTenant = await getTenantById(tenantId);

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Tenant Added",
      id: tenantId,
      tenant: newTenant || { id: tenantId },
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create tenant",
      error.message,
    );
  }
}

export async function editTenant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Tenant ID");
    }

    const {
      regNo,
      regDate,
      name,
      address,
      mobileNo,
      countryId,
      stateId,
      cityId,
      identityProof,
      identityProofNumber,
      status,
      inactiveDate,
      nextOfKinName,
      nextOfKinMobileNo,
      nextOfKinAddress,
    } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Tenant name is required");
    }

    if (!regNo || !String(regNo).trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Registration number is required",
      );
    }

    const trimmedRegNo = String(regNo).trim();
    const isDuplicate = await checkDuplicateRegNo(trimmedRegNo, id);
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Registration number "${trimmedRegNo}" already exists`,
      );
    }

    const success = await updateTenant(id, {
      regNo: trimmedRegNo,
      regDate: regDate || new Date().toISOString().split("T")[0],
      name: name.trim(),
      address: address ? address.trim() : null,
      mobileNo:
        mobileNo && String(mobileNo).trim() ? String(mobileNo).trim() : null,
      countryId: countryId ? parseInt(countryId, 10) : null,
      stateId: stateId ? parseInt(stateId, 10) : null,
      cityId: cityId ? parseInt(cityId, 10) : null,
      identityProof: identityProof || "Driving License",
      identityProofNumber: identityProofNumber
        ? identityProofNumber.trim()
        : null,
      status: status || "Active",
      inactiveDate: inactiveDate ? String(inactiveDate).trim() : null,
      nextOfKinName: nextOfKinName ? nextOfKinName.trim() : null,
      nextOfKinMobileNo: nextOfKinMobileNo ? nextOfKinMobileNo.trim() : null,
      nextOfKinAddress: nextOfKinAddress ? nextOfKinAddress.trim() : null,
    });

    if (!success) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Tenant not found or unchanged",
      );
    }

    const updatedTenant = await getTenantById(id);

    return res.status(HTTP_STATUS.OK).json({
      message: "Tenant Updated",
      id,
      tenant: updatedTenant || { id },
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update tenant",
      error.message,
    );
  }
}

export async function removeTenant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Tenant ID");
    }
    const usageCheck = await checkTenantInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This tenant is in use. Cannot be deleted.",
      );
    }

    const success = await deleteTenant(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Tenant not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Tenant Deleted",
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
        "This tenant is in use. Cannot be deleted.",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete tenant",
      error.message,
    );
  }
}

export async function getTenantLedger(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Tenant ID");
    }

    const { fromDate, toDate } = req.query;

    const ledgerData = await getTenantLedgerData(
      id,
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined,
    );

    return res.status(HTTP_STATUS.OK).json({
      status: true,
      openingAmount: ledgerData.openingAmount,
      ledger: ledgerData.ledger,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch tenant ledger",
      error.message,
    );
  }
}

export async function getTenantSecurityLedger(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Tenant ID");
    }

    const { fromDate, toDate } = req.query;

    const ledgerData = await getTenantSecurityLedgerData(
      id,
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined,
    );

    return res.status(HTTP_STATUS.OK).json({
      status: true,
      openingAmount: ledgerData.openingAmount,
      ledger: ledgerData.ledger,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch tenant security ledger",
      error.message,
    );
  }
}
