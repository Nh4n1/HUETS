import mongoose, { Schema } from 'mongoose';
import type { Document } from 'mongoose';

export interface ICategory extends Document {
    code: string;
    name: string;
    description?: string;
    sortOrder: number;
    isActive: boolean;
    allowedTagCodes: string[];
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
    {
        code: { type: String, required: true, trim: true, lowercase: true, immutable: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        sortOrder: { type: Number, required: true, default: 0 },
        isActive: { type: Boolean, required: true, default: true },
        allowedTagCodes: { type: [String], required: true, default: [] },
    },
    { timestamps: true, collection: 'categories' },
);

categorySchema.index({ code: 1 }, { unique: true });
categorySchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.model<ICategory>('Category', categorySchema);
