import { Router } from "express";
import { authenticate } from "../middlewares/authentication";
import {
  getAllotments,
  getAllotmentDetail,
  createNewAllotment,
  editAllotment,
  removeAllotment,
} from "../controllers/allotmentController";

const router = Router();

router.use(authenticate);

router.get("/allotments", getAllotments);
router.get("/tenants/:tenantId/allotments", getAllotments);
router.get("/allotments/:id", getAllotmentDetail);
router.post("/allotments", createNewAllotment);
router.put("/allotments/:id", editAllotment);
router.delete("/allotments/:id", removeAllotment);

export default router;
