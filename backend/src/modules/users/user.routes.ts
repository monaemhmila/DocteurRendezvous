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
import { requireAuth, requireRole } from "../../shared/middleware/requireAuth";

const router = Router();

router.use(requireAuth as any);

// Team routes for clinic owners and authenticated members
router.get("/team", getTeamMembers as any);
router.post("/team", requireRole("clinic_owner") as any, createTeamMember as any);
router.put("/team/:id", requireRole("clinic_owner") as any, updateTeamMember as any);
router.patch("/team/:id/status", requireRole("clinic_owner") as any, updateTeamMemberStatus as any);
router.post("/team/:id/reset-password", requireRole("clinic_owner") as any, resetTeamMemberPassword as any);
router.delete("/team/:id", requireRole("clinic_owner") as any, deleteTeamMember as any);

// Super admin global user list
router.get("/all", getAllUsers as any);

export default router;
