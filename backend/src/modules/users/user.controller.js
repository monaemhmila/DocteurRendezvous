"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = exports.getTeamMembers = void 0;
const user_model_1 = require("./user.model");
const getTeamMembers = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "No tenant context" });
        const users = await user_model_1.User.find({ tenantId }).select("-passwordHash").sort({ createdAt: 1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getTeamMembers = getTeamMembers;
const getAllUsers = async (req, res) => {
    try {
        if (req.user?.role !== "super_admin") {
            return res.status(403).json({ error: "Forbidden" });
        }
        const users = await user_model_1.User.find().populate("tenantId", "name").select("-passwordHash").sort({ createdAt: -1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getAllUsers = getAllUsers;
//# sourceMappingURL=user.controller.js.map