"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        // Fail closed: never authenticate with a built-in/default signing secret.
        console.error("[Auth] JWT_SECRET is missing or too weak.");
        return res.status(503).json({ error: "Authentication service is not configured" });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
        return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret, { algorithms: ["HS256"] });
        if (typeof decoded.id !== "string" || typeof decoded.role !== "string") {
            return res.status(401).json({ error: "Unauthorized: Invalid token" });
        }
        req.user = {
            id: decoded.id,
            tenantId: decoded.tenantId || "",
            role: decoded.role,
        };
        next();
    }
    catch {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=requireAuth.js.map