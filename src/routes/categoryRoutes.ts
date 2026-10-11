import { Router } from "express";
import { authenticate } from "../middlewares/authentication";
import {
  getCategoriesListHandler,
  getCategoryDetailHandler,
  createNewCategoryHandler,
  editCategoryHandler,
  removeCategoryHandler,
} from "../controllers/categoryController";

const router = Router();

router.use(authenticate);

router.get("/categories", getCategoriesListHandler);
router.get("/categories/:id", getCategoryDetailHandler);
router.post("/categories", createNewCategoryHandler);
router.put("/categories/:id", editCategoryHandler);
router.delete("/categories/:id", removeCategoryHandler);

export default router;
