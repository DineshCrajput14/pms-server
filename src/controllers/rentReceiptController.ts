import { Request, Response } from "express";
import {
  getAllRentReceipts,
  getRentReceiptById,
  createRentReceipt,
  updateRentReceipt,
  deleteRentReceipt,
  getPendingDuesForTenantOrAllotment,
  getTenantDetailForReceipt,
  checkRentReceiptInUse,
} from "../models/rentReceiptModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

const RECEIPT_MODES_LIST = [
  { id: 1, name: "Cash" },
  { id: 2, name: "Cheque" },
  { id: 3, name: "Online" },
  { id: 4, name: "Bank Transfer" },
];

function resolveReceiptModeName(mode: any): string {
  if (mode === undefined || mode === null || mode === "") {
    return "Cash";
  }
  if (
    typeof mode === "number" ||
    (!isNaN(Number(mode)) && typeof mode === "string" && mode.trim() !== "")
  ) {
    const found = RECEIPT_MODES_LIST.find(
      (modeItem) => modeItem.id === Number(mode),
    );
    if (found) return found.name;
  }
  return String(mode);
}

export async function getRentReceiptsList(req: Request, res: Response) {
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

    const receipts = await getAllRentReceipts({
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
      rentReceipts: receipts,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch rent receipts",
      error.message,
    );
  }
}

export async function getRentReceiptDetail(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Rent Receipt ID");
    }

    const receipt = await getRentReceiptById(id);
    if (!receipt) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Rent Receipt not found");
    }

    const modeObj = RECEIPT_MODES_LIST.find(
      (modeItem) => modeItem.name === receipt.receiptMode,
    );
    const receiptData = {
      ...receipt,
      receiptModeId: modeObj ? modeObj.id : 1,
    };

    return res.status(HTTP_STATUS.OK).json({
      rentReceipt: receiptData,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch rent receipt detail",
      error.message,
    );
  }
}

export async function createNewRentReceipt(req: Request, res: Response) {
  try {
    const {
      receiptNo,
      receiptDate,
      tenantId,
      allotmentId,
      propertyId,
      unitId,
      receiptMode,
      totalReceivable,
      receivedAmount,
      balance,
      remarks,
      chequeDraftNo,
      chequeDraftDate,
      details,
    } = req.body;

    if (!tenantId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Tenant ID is required");
    }
    if (!receiptDate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Receipt Date is required",
      );
    }

    const resolvedMode = resolveReceiptModeName(receiptMode);

    const receiptId = await createRentReceipt({
      receiptNo: receiptNo ? String(receiptNo).trim() : undefined,
      receiptDate: String(receiptDate),
      tenantId: Number(tenantId),
      allotmentId: allotmentId ? Number(allotmentId) : undefined,
      propertyId: propertyId ? Number(propertyId) : undefined,
      unitId: unitId ? Number(unitId) : undefined,
      receiptMode: resolvedMode,
      totalReceivable:
        totalReceivable !== undefined ? Number(totalReceivable) : 0,
      receivedAmount: receivedAmount !== undefined ? Number(receivedAmount) : 0,
      balance: balance !== undefined ? Number(balance) : 0,
      remarks: remarks ? String(remarks).trim() : undefined,
      chequeDraftNo: chequeDraftNo ? String(chequeDraftNo).trim() : undefined,
      chequeDraftDate: chequeDraftDate
        ? String(chequeDraftDate).trim()
        : undefined,
      details: Array.isArray(details) ? details : undefined,
    });

    const newReceipt = await getRentReceiptById(receiptId);
    const modeObj = RECEIPT_MODES_LIST.find(
      (modeItem) => modeItem.name === resolvedMode,
    );
    const receiptData = newReceipt
      ? { ...newReceipt, receiptModeId: modeObj ? modeObj.id : 1 }
      : { id: receiptId, receiptModeId: 1 };

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Rent Receipt Generated",
      id: receiptId,
      rentReceipt: receiptData,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      error.message || "Failed to create rent receipt",
    );
  }
}

export async function updateExistingRentReceipt(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Rent Receipt ID");
    }

    const {
      receiptDate,
      receiptMode,
      totalReceivable,
      receivedAmount,
      balance,
      remarks,
      chequeDraftNo,
      chequeDraftDate,
      details,
    } = req.body;

    const existingReceipt = await getRentReceiptById(id);
    if (!existingReceipt) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Rent Receipt not found");
    }

    const resolvedMode =
      receiptMode !== undefined
        ? resolveReceiptModeName(receiptMode)
        : undefined;

    await updateRentReceipt(id, {
      receiptDate: receiptDate ? String(receiptDate) : undefined,
      receiptMode: resolvedMode,
      totalReceivable:
        totalReceivable !== undefined ? Number(totalReceivable) : undefined,
      receivedAmount:
        receivedAmount !== undefined ? Number(receivedAmount) : undefined,
      balance: balance !== undefined ? Number(balance) : undefined,
      remarks: remarks !== undefined ? String(remarks).trim() : undefined,
      chequeDraftNo:
        chequeDraftNo !== undefined
          ? chequeDraftNo
            ? String(chequeDraftNo).trim()
            : null
          : undefined,
      chequeDraftDate:
        chequeDraftDate !== undefined
          ? chequeDraftDate
            ? String(chequeDraftDate).trim()
            : null
          : undefined,
      details: Array.isArray(details) ? details : undefined,
    });

    const updated = await getRentReceiptById(id);
    const modeObj = updated
      ? RECEIPT_MODES_LIST.find(
          (modeItem) => modeItem.name === updated.receiptMode,
        )
      : null;
    const receiptData = updated
      ? { ...updated, receiptModeId: modeObj ? modeObj.id : 1 }
      : null;

    return res.status(HTTP_STATUS.OK).json({
      message: "Rent Receipt Updated",
      id,
      rentReceipt: receiptData,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      error.message || "Failed to update rent receipt",
    );
  }
}

export async function removeRentReceipt(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Rent Receipt ID");
    }

    const usageCheck = await checkRentReceiptInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This rent receipt is in use. Cannot be deleted.",
      );
    }

    const success = await deleteRentReceipt(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Rent Receipt not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Rent Receipt Deleted",
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
        "This rent receipt is in use. Cannot be deleted.",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      error.message || "This rent receipt is in use. Cannot be deleted.",
    );
  }
}

export async function getReceiptModesController(req: Request, res: Response) {
  try {
    return res.status(HTTP_STATUS.OK).json({
      receiptModes: RECEIPT_MODES_LIST,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch receipt modes",
      error.message,
    );
  }
}

export async function getTenantDetailForReceiptController(
  req: Request,
  res: Response,
) {
  try {
    const id = parseInt(req.params.id, 10) || 0;
    const registrationNumber = req.query.registrationNumber || req.query.regNo;
    const receiptDate = req.query.receiptDate
      ? String(req.query.receiptDate)
      : undefined;

    if (!registrationNumber) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "registrationNumber is required",
      );
    }

    const result = await getTenantDetailForReceipt(
      id,
      String(registrationNumber),
      receiptDate,
    );

    if (!result) {
      return res.status(HTTP_STATUS.OK).json({
        status: true,
        tenantDetail: null,
        dueRentSummary: [],
        receiptDetails: [],
        isFullyPaid: false,
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      status: true,
      ...result,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch tenant detail for receipt",
      error.message,
    );
  }
}

export async function getRentReceiptPrintController(
  req: Request,
  res: Response,
) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Rent Receipt ID");
    }

    const receipt = await getRentReceiptById(id);
    if (!receipt) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Rent Receipt not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      status: true,
      message: "Receipt print data retrieved successfully",
      rentReceipt: receipt,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch receipt for print",
      error.message,
    );
  }
}
