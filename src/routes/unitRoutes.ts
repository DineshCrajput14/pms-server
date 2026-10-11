import { Router } from "express";
import { authenticate } from "../middlewares/authentication";
import {
  getUnitsListHandler,
  getUnitDetailHandler,
  createNewUnitHandler,
  editUnitHandler,
  removeUnitHandler,
} from "../controllers/unitController";

const router = Router();

router.use(authenticate);

router.get("/units", getUnitsListHandler);
router.get("/units/:id", getUnitDetailHandler);
router.post("/units", createNewUnitHandler);
router.put("/units/:id", editUnitHandler);
router.delete("/units/:id", removeUnitHandler);

export default router;
