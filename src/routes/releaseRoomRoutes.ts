import { Router } from "express";
import { authenticate } from "../middlewares/authentication";
import {
  getReleaseRoomsList,
  getReleaseRoomDetail,
  createNewReleaseRoom,
  updateExistingReleaseRoom,
  removeReleaseRoom,
  getTenantDetailForReleaseRoomController,
} from "../controllers/releaseRoomController";

const router = Router();

router.use(authenticate);

router.get(
  "/release-room/tenant-detail",
  getTenantDetailForReleaseRoomController,
);
router.get("/release-room", getReleaseRoomsList);
router.get("/release-room/:id", getReleaseRoomDetail);
router.post("/release-room", createNewReleaseRoom);
router.put("/release-room/:id", updateExistingReleaseRoom);
router.delete("/release-room/:id", removeReleaseRoom);

export default router;
