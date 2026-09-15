import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/requireAuth";
import { User } from "./user.model";

export const getTeamMembers = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "No tenant context" });

    const users = await User.find({ tenantId }).select("-passwordHash").sort({ createdAt: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const users = await User.find().populate("tenantId", "name").select("-passwordHash").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
