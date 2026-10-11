import { Router } from "express";
import { authenticate } from "../middlewares/authentication";
import {
  getRentReceiptsList,
  getRentReceiptDetail,
  createNewRentReceipt,
  updateExistingRentReceipt,
  removeRentReceipt,
  getReceiptModesController,
  getTenantDetailForReceiptController,
  getRentReceiptPrintController,
} from "../controllers/rentReceiptController";

const router = Router();

router.use(authenticate);

router.get("/receipt-modes", getReceiptModesController);
router.get("/fee-receipts", getRentReceiptsList);
router.get(
  "/fee-receipts/:id/tenant-detail",
  getTenantDetailForReceiptController,
);
router.get("/fee-receipts/:id/print", getRentReceiptPrintController);
router.get("/fee-receipts/:id", getRentReceiptDetail);
router.post("/fee-receipts", createNewRentReceipt);
router.put("/fee-receipts/:id", updateExistingRentReceipt);
router.delete("/fee-receipts/:id", removeRentReceipt);

export default router;
