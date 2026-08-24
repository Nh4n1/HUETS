import mongoose, { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export const FEEDBACK_TYPES = ['bug', 'suggestion', 'feature_request', 'usability', 'data_feedback', 'other'] as const;
export const FEEDBACK_STATUSES = ['new', 'reviewing', 'resolved', 'closed'] as const;

export type FeedbackType = typeof FEEDBACK_TYPES[number];
export type FeedbackStatus = typeof FEEDBACK_STATUSES[number];

export interface IFeedbackImage {
    url: string;
    publicId: string | null;
    position: number;
}

export interface IFeedback extends Document {
    userId: Types.ObjectId | null;
    type: FeedbackType;
    title: string;
    description: string;
    contactEmail: string | null;
    images: IFeedbackImage[];
    status: FeedbackStatus;
    adminNote: string | null;
    handledBy: Types.ObjectId | null;
    handledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const feedbackImageSchema = new Schema<IFeedbackImage>({
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    position: { type: Number, required: true, min: 0 },
}, { _id: false });

const feedbackSchema = new Schema<IFeedback>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: FEEDBACK_TYPES, required: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 150 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
    contactEmail: { type: String, default: null, trim: true, lowercase: true },
    images: { type: [feedbackImageSchema], required: true, default: [] },
    status: { type: String, enum: FEEDBACK_STATUSES, required: true, default: 'new' },
    adminNote: { type: String, default: null, maxlength: 2000 },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    handledAt: { type: Date, default: null },
}, { timestamps: true, collection: 'feedbacks' });

feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, createdAt: -1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IFeedback>('Feedback', feedbackSchema);
