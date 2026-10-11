import { Router } from "express";
import {
  getUsersListHandler,
  getUserDetailHandler,
  createNewUserHandler,
  editUserHandler,
  removeUserHandler,
} from "../controllers/userController";

const router = Router();

router.get("/users", getUsersListHandler);
router.get("/users/:id", getUserDetailHandler);
router.post("/users", createNewUserHandler);
router.put("/users/:id", editUserHandler);
router.delete("/users/:id", removeUserHandler);

export default router;
