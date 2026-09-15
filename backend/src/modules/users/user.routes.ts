import { Router } from "express";
import { getTeamMembers, getAllUsers } from "./user.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

router.get("/team", getTeamMembers as any);
router.get("/all", getAllUsers as any);

export default router;
