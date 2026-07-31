import mongoose, { Schema } from 'mongoose';
import type { Document } from 'mongoose';

export interface ISearchAnchorGeo {
    type: 'Point';
    coordinates: [number, number];
}

export interface ISearchAnchor extends Document {
    code: string;
    name: string;
    normalizedName: string;
    geo: ISearchAnchorGeo;
    defaultRadiusM: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const searchAnchorGeoSchema = new Schema<ISearchAnchorGeo>(
    {
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: { type: [Number], required: true },
    },
    { _id: false },
);

const searchAnchorSchema = new Schema<ISearchAnchor>(
    {
        code: { type: String, required: true },
        name: { type: String, required: true },
        normalizedName: { type: String, required: true },
        geo: { type: searchAnchorGeoSchema, required: true },
        defaultRadiusM: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: 'search_anchors' },
);

searchAnchorSchema.index({ code: 1 }, { unique: true });
searchAnchorSchema.index({ isActive: 1 });
searchAnchorSchema.index({ geo: '2dsphere' });

export default mongoose.model<ISearchAnchor>('SearchAnchor', searchAnchorSchema);
