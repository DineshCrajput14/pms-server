import { Router } from "express";
import { authenticate } from "../middlewares/authentication";
import {
  getFloorsListHandler,
  getFloorDetailHandler,
  createNewFloorHandler,
  editFloorHandler,
  removeFloorHandler,
} from "../controllers/floorController";

const router = Router();

router.use(authenticate);

router.get("/floors", getFloorsListHandler);
router.get("/floors/:id", getFloorDetailHandler);
router.post("/floors", createNewFloorHandler);
router.put("/floors/:id", editFloorHandler);
router.delete("/floors/:id", removeFloorHandler);

export default router;
