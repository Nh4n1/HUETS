import { z } from 'zod';

const nullableTrimmed = (maximum: number) => z.union([
    z.string().trim().max(maximum),
    z.null(),
]).optional().transform((value) => value || null);

const ownershipClaimFields = {
    relationship: z.enum(['owner', 'authorized_representative', 'authorized_manager']),
    contactName: z.string().trim().min(2).max(100),
    contactPhone: nullableTrimmed(30),
    contactEmail: z.union([z.email().max(254), z.literal(''), z.null()]).optional()
        .transform((value) => value || null),
    note: z.string().trim().min(20).max(1000),
    evidenceAssetTokens: z.array(z.string().min(1)).min(1).max(5),
};

export const ownershipClaimSchema = z.object(ownershipClaimFields).superRefine((claim, context) => {
    if (!claim.contactPhone && !claim.contactEmail) {
        context.addIssue({
            code: 'custom',
            path: ['contactPhone'],
            message: 'Cần cung cấp ít nhất số điện thoại hoặc email liên hệ.',
        });
    }
});

export const createOwnershipSchema = z.discriminatedUnion('locationMode', [
    z.object({
        locationMode: z.literal('existing'),
        locationId: z.string().min(1),
        claim: ownershipClaimSchema,
    }),
    z.object({
        locationMode: z.literal('new'),
        location: z.record(z.string(), z.unknown()),
        claim: ownershipClaimSchema,
    }),
]);

export const updateOwnershipSchema = z.object(ownershipClaimFields).partial().refine(
    (value) => Object.keys(value).length > 0,
    { message: 'Cần cung cấp ít nhất một nội dung cập nhật.' },
);

export const ownershipReviewSchema = z.object({
    reasonCode: z.string().trim().min(1).max(100),
    reason: z.string().trim().min(10).max(2000),
});
