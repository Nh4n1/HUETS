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
    tags: ITag[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
    {
        code: { type: String, required: true },
        name: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    { _id: false },
);

const tagGroupSchema = new Schema<ITagGroup>(
    {
        code: { type: String, required: true },
        name: { type: String, required: true },
        selectionMode: { type: String, enum: ['single', 'multiple'], required: true },
        tags: { type: [tagSchema], default: [] },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: 'tag_groups' },
);

tagGroupSchema.index({ code: 1 }, { unique: true });
tagGroupSchema.index({ 'tags.code': 1 });

export default mongoose.model<ITagGroup>('TagGroup', tagGroupSchema);
