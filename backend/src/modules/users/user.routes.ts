import { Router } from "express";
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  updateTeamMemberStatus,
  resetTeamMemberPassword,
  deleteTeamMember,
  getAllUsers,
} from "./user.controller";
import { requireAuth } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

// Team routes for clinic owners and authenticated members
router.get("/team", getTeamMembers as any);
router.post("/team", createTeamMember as any);
router.put("/team/:id", updateTeamMember as any);
router.patch("/team/:id/status", updateTeamMemberStatus as any);
router.post("/team/:id/reset-password", resetTeamMemberPassword as any);
router.delete("/team/:id", deleteTeamMember as any);

// Super admin global user list
router.get("/all", getAllUsers as any);

export default router;
