import { Router } from "express";
import { getDashboardSummaryController } from "../controllers/dashboardController";
import { authenticate } from "../middlewares/authentication";

const router = Router();

router.use(authenticate);

router.get("/dashboard-summary", getDashboardSummaryController);

export default router;
