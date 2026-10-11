import { Request, Response } from "express";
import {
  getTenantRegisterReport,
  TenantRegisterQueryParams,
  getMonthlyRentRegisterReport,
  RentRegisterQueryParams,
  getMonthlyRefundRegisterReport,
  RefundRegisterQueryParams,
  getOutstandingRegisterReport,
  OutstandingRegisterQueryParams,
  getOccupancyReportData,
  OccupancyReportQueryParams,
  getAgreementExpiryReportData,
  AgreementExpiryQueryParams,
} from "../models/reportModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getTenantRegister(req: Request, res: Response) {
  try {
    const {
      propertyId,
      buildingId,
      unitId,
      status,
      fromDate,
      toDate,
      searchField,
      keyword,
    } = req.query;

    const queryParams: TenantRegisterQueryParams = {
      propertyId: propertyId ? String(propertyId) : undefined,
      buildingId: buildingId ? String(buildingId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
      status: status ? String(status) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      searchField: searchField ? String(searchField) : undefined,
      keyword: keyword ? String(keyword) : undefined,
    };

    const report = await getTenantRegisterReport(queryParams);

    return res.status(HTTP_STATUS.OK).json({ report });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch tenant register report",
      error.message,
    );
  }
}

export async function getMonthlyRentRegister(req: Request, res: Response) {
  try {
    const {
      propertyId,
      buildingId,
      unitId,
      status,
      fromDate,
      toDate,
      searchField,
      keyword,
    } = req.query;

    const queryParams: RentRegisterQueryParams = {
      propertyId: propertyId ? String(propertyId) : undefined,
      buildingId: buildingId ? String(buildingId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
      status: status ? String(status) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      searchField: searchField ? String(searchField) : undefined,
      keyword: keyword ? String(keyword) : undefined,
    };

    const report = await getMonthlyRentRegisterReport(queryParams);

    return res.status(HTTP_STATUS.OK).json({ report });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch rent register report",
      error.message,
    );
  }
}

export async function getMonthlyRefundRegister(req: Request, res: Response) {
  try {
    const {
      propertyId,
      buildingId,
      unitId,
      status,
      fromDate,
      toDate,
      searchField,
      keyword,
    } = req.query;

    const queryParams: RefundRegisterQueryParams = {
      propertyId: propertyId ? String(propertyId) : undefined,
      buildingId: buildingId ? String(buildingId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
      status: status ? String(status) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      searchField: searchField ? String(searchField) : undefined,
      keyword: keyword ? String(keyword) : undefined,
    };

    const report = await getMonthlyRefundRegisterReport(queryParams);

    return res.status(HTTP_STATUS.OK).json({ report });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch refund register report",
      error.message,
    );
  }
}

export async function getOutstandingRegister(req: Request, res: Response) {
  try {
    const {
      propertyId,
      buildingId,
      unitId,
      status,
      fromDate,
      toDate,
      searchField,
      keyword,
      monthwise,
    } = req.query;

    const queryParams: OutstandingRegisterQueryParams = {
      propertyId: propertyId ? String(propertyId) : undefined,
      buildingId: buildingId ? String(buildingId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
      status: status ? String(status) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      searchField: searchField ? String(searchField) : undefined,
      keyword: keyword ? String(keyword) : undefined,
      monthwise: monthwise ? String(monthwise) : undefined,
    };

    const { report, months } = await getOutstandingRegisterReport(queryParams);

    return res.status(HTTP_STATUS.OK).json({ report, months });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch outstanding register report",
      error.message,
    );
  }
}

export async function getOccupancyReport(req: Request, res: Response) {
  try {
    const { propertyId, buildingId, unitId, status } = req.query;

    const queryParams: OccupancyReportQueryParams = {
      propertyId: propertyId ? String(propertyId) : undefined,
      buildingId: buildingId ? String(buildingId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
      status: status ? String(status) : undefined,
    };

    const report = await getOccupancyReportData(queryParams);

    return res.status(HTTP_STATUS.OK).json({ report });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch occupancy report",
      error.message,
    );
  }
}

export async function getAgreementExpiryReport(req: Request, res: Response) {
  try {
    const {
      propertyId,
      buildingId,
      unitId,
      status,
      fromDate,
      toDate,
      searchField,
      keyword,
    } = req.query;

    const queryParams: AgreementExpiryQueryParams = {
      propertyId: propertyId ? String(propertyId) : undefined,
      buildingId: buildingId ? String(buildingId) : undefined,
      unitId: unitId ? String(unitId) : undefined,
      status: status ? String(status) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      searchField: searchField ? String(searchField) : undefined,
      keyword: keyword ? String(keyword) : undefined,
    };

    const report = await getAgreementExpiryReportData(queryParams);

    return res.status(HTTP_STATUS.OK).json({ report });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch agreement expiry report",
      error.message,
    );
  }
}
