import mongoose, { Schema } from 'mongoose';
import type { Document } from 'mongoose';

export type TagSelectionMode = 'single' | 'multiple';

export interface ITag {
    code: string;
    name: string;
    isActive: boolean;
}

export interface ITagGroup extends Document {
    code: string;
    name: string;
    selectionMode: TagSelectionMode;
    sortOrder: number;
    tags: ITag[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
    {
        code: { type: String, required: true, trim: true, lowercase: true, immutable: true },
        name: { type: String, required: true, trim: true },
        isActive: { type: Boolean, required: true, default: true },
    },
    { _id: false },
);

const tagGroupSchema = new Schema<ITagGroup>(
    {
        code: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        selectionMode: { type: String, enum: ['single', 'multiple'], required: true },
        sortOrder: { type: Number, required: true, default: 0 },
        tags: { type: [tagSchema], required: true, default: [] },
        isActive: { type: Boolean, required: true, default: true },
    },
    { timestamps: true, collection: 'tag_groups' },
);

tagGroupSchema.index({ code: 1 }, { unique: true });
tagGroupSchema.index({ 'tags.code': 1 });
tagGroupSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.model<ITagGroup>('TagGroup', tagGroupSchema);
