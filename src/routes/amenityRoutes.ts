import { Router } from "express";
import { authenticate } from "../middlewares/authentication";
import {
  getAmenitiesListHandler,
  getAmenityDetailHandler,
  createNewAmenityHandler,
  editAmenityHandler,
  removeAmenityHandler,
} from "../controllers/amenityController";

const router = Router();

router.use(authenticate);

router.get("/amenities", getAmenitiesListHandler);
router.get("/amenities/:id", getAmenityDetailHandler);
router.post("/amenities", createNewAmenityHandler);
router.put("/amenities/:id", editAmenityHandler);
router.delete("/amenities/:id", removeAmenityHandler);

export default router;
