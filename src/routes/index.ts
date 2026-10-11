import { Router } from "express";
import authRoutes from "./authRoutes";
import locationRoutes from "./locationRoutes";
import propertyRoutes from "./propertyRoutes";
import buildingRoutes from "./buildingRoutes";
import floorRoutes from "./floorRoutes";
import categoryRoutes from "./categoryRoutes";
import unitRoutes from "./unitRoutes";
import amenityRoutes from "./amenityRoutes";
import userRoutes from "./userRoutes";
import settingsRoutes from "./settingsRoutes";
import tenantRoutes from "./tenantRoutes";
import allotmentRoutes from "./allotmentRoutes";
import rentReceiptRoutes from "./rentReceiptRoutes";
import releaseRoomRoutes from "./releaseRoomRoutes";
import dashboardRoutes from "./dashboardRoutes";
import reportRoutes from "./reportRoutes";

const router = Router();

router.use("/", authRoutes);
router.use("/", locationRoutes);
router.use("/", propertyRoutes);
router.use("/", buildingRoutes);
router.use("/", floorRoutes);
router.use("/", categoryRoutes);
router.use("/", unitRoutes);
router.use("/", amenityRoutes);
router.use("/", userRoutes);
router.use("/", settingsRoutes);
router.use("/", tenantRoutes);
router.use("/", allotmentRoutes);
router.use("/", rentReceiptRoutes);
router.use("/", releaseRoomRoutes);
router.use("/", dashboardRoutes);
router.use("/", reportRoutes);

export default router;
