import mongoose, { Schema } from 'mongoose';
import type { Document } from 'mongoose';

export interface ICategory extends Document {
    code: string;
    name: string;
    description?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
    {
        code: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String },
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: 'categories' },
);

categorySchema.index({ code: 1 }, { unique: true });
categorySchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.model<ICategory>('Category', categorySchema);
