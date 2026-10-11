import { Router } from "express";
import {
  getControlPanel,
  saveControlPanel,
} from "../controllers/settingsController";
import { authenticate } from "../middlewares/authentication";

const router = Router();

router.use(authenticate);

router.get("/control-panel-settings", getControlPanel);
router.post("/control-panel-settings", saveControlPanel);

export default router;
