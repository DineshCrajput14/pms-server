import { Router } from "express";
import { login, register, getProfile } from "../controllers/authController";
import { authenticate } from "../middlewares/authentication";

const router = Router();

router.post("/v1/authenticate", login);
router.post("/authenticate", login);
router.post("/auth/register", register);
router.get("/auth/profile", authenticate, getProfile);

export default router;
