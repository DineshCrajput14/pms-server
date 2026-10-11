import { Router } from "express";
import { authenticate } from "../middlewares/authentication";
import {
  getPropertyTypesListHandler,
  getBuildingsListHandler,
  getBuildingDetailHandler,
  createNewBuildingHandler,
  editBuildingHandler,
  removeBuildingHandler,
} from "../controllers/buildingController";

const router = Router();

router.use(authenticate);

router.get("/property-types", getPropertyTypesListHandler);

router.get("/buildings", getBuildingsListHandler);
router.get("/buildings/:id", getBuildingDetailHandler);
router.post("/buildings", createNewBuildingHandler);
router.put("/buildings/:id", editBuildingHandler);
router.delete("/buildings/:id", removeBuildingHandler);

export default router;
