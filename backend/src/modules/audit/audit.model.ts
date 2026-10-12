import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // The user (secretary, doctor) who performed the action
  userRole: string;
  action: string; // e.g., "VIEW_PATIENT", "CANCEL_APPOINTMENT", "EXPORT_DATA"
  resourceType: string; // e.g., "patient", "appointment", "settings"
  resourceId?: string; // The ID of the accessed/modified document
  details?: string; // Additional context (JSON stringified)
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String },
    details: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // Immutable logs
);

// TTL Index: Automatically delete audit logs after 3 years (HIPAA/GDPR compliance requires retaining logs, but not forever)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 365 * 24 * 60 * 60 });
// Strict tenant isolation index
AuditLogSchema.index({ tenantId: 1, resourceType: 1, resourceId: 1 });

// Enforce application-level append-only protection
const immutableError = new Error("Audit logs are append-only and cannot be modified via the application");
const methods = [
  'updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 
  'findOneAndDelete', 'replaceOne', 'findOneAndReplace'
];
methods.forEach(method => {
  AuditLogSchema.pre(method as any, function (this: any, next: any) { next(immutableError); });
});
// Note: BulkWrite cannot be easily hooked via standard schema pre hooks without overriding the model method. 
// Thus, this is "append-only applicatif protégé". Real immutability requires MongoDB DB-level user permission changes.

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
