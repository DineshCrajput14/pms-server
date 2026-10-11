import { Router } from "express";
import {
  getTenantRegister,
  getMonthlyRentRegister,
  getMonthlyRefundRegister,
  getOutstandingRegister,
  getOccupancyReport,
  getAgreementExpiryReport,
} from "../controllers/reportController";
import { authenticate } from "../middlewares/authentication";

const router = Router();

router.use(authenticate);

router.get("/reports/tenant-register", getTenantRegister);
router.get("/reports/monthly-rent-register", getMonthlyRentRegister);
router.get("/reports/monthly-refund-register", getMonthlyRefundRegister);
router.get("/reports/outstanding", getOutstandingRegister);
router.get("/reports/occupancy-report", getOccupancyReport);
router.get("/reports/agreement-expiry", getAgreementExpiryReport);

export default router;
