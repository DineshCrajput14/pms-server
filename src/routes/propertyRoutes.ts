import { Router } from "express";
import {
  getPropertiesList,
  getPropertyDetail,
  createNewProperty,
  editProperty,
  removeProperty,
} from "../controllers/propertyController";
import { authenticate } from "../middlewares/authentication";

const router = Router();

router.use(authenticate);

router.get("/properties", getPropertiesList);
router.get("/properties/:id", getPropertyDetail);
router.post("/properties", createNewProperty);
router.put("/properties/:id", editProperty);
router.delete("/properties/:id", removeProperty);

export default router;
