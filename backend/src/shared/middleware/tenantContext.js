"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantContext = void 0;
// This middleware ensures that whenever a user makes a request, 
// we explicitly filter database queries by their tenantId.
const tenantContext = (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
        return res.status(403).json({ error: "Forbidden: No tenant context found" });
    }
    // You can attach tenantId to a specific locals object or just rely on req.user.tenantId
    res.locals.tenantId = req.user.tenantId;
    next();
};
exports.tenantContext = tenantContext;
//# sourceMappingURL=tenantContext.js.map