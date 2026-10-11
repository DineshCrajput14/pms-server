import { Router } from "express";
import {
  getTenantsList,
  getTenantDetail,
  createNewTenant,
  editTenant,
  removeTenant,
  getTenantLedger,
  getTenantSecurityLedger,
} from "../controllers/tenantController";
import { authenticate } from "../middlewares/authentication";

const router = Router();

router.use(authenticate);

router.get("/tenants", getTenantsList);
router.get("/tenants/:id", getTenantDetail);
router.get("/tenants/:id/ledger", getTenantLedger);
router.get("/tenants/:id/security-ledger", getTenantSecurityLedger);
router.post("/tenants", createNewTenant);
router.put("/tenants/:id", editTenant);
router.delete("/tenants/:id", removeTenant);

export default router;
