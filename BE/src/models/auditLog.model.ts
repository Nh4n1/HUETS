import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IAuditLogTarget {
    type: string;
    id: Types.ObjectId;
}

export interface IAuditLogChanges {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
}

export interface IAuditLog extends Document {
    actorId: Types.ObjectId;
    action: string;
    target: IAuditLogTarget;
    changes: IAuditLogChanges;
    reason: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}

const auditLogTargetSchema = new Schema<IAuditLogTarget>(
    {
        type: { type: String, required: true },
        id: { type: Schema.Types.ObjectId, required: true },
    },
    { _id: false },
);

const auditLogChangesSchema = new Schema<IAuditLogChanges>(
    {
        before: { type: Schema.Types.Mixed, default: null },
        after: { type: Schema.Types.Mixed, default: null },
    },
    { _id: false },
);

const auditLogSchema = new Schema<IAuditLog>(
    {
        actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        action: { type: String, required: true },
        target: { type: auditLogTargetSchema, required: true },
        changes: { type: auditLogChangesSchema, default: () => ({ before: null, after: null }) },
        reason: { type: String, default: null },
        metadata: { type: Schema.Types.Mixed, default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' },
);

auditLogSchema.index({ 'target.type': 1, 'target.id': 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
