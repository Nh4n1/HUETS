import { describe, expect, it } from 'vitest';
import { createOwnershipSchema, ownershipClaimSchema, ownershipReviewSchema } from './locationOwnership.schema.ts';

const validClaim = {
    relationship: 'authorized_manager',
    contactName: 'Nguyễn Văn An',
    contactPhone: '0901234567',
    contactEmail: '',
    note: 'Tôi là quản lý được ủy quyền và ảnh chụp tại cơ sở.',
    evidenceAssetTokens: ['signed-token'],
};

describe('location ownership schemas', () => {
    it('accepts the Feature Spec relationship name authorized_manager', () => {
        expect(ownershipClaimSchema.parse(validClaim)).toMatchObject({
            relationship: 'authorized_manager',
            contactEmail: null,
        });
    });

    it('requires at least one contact channel', () => {
        const result = ownershipClaimSchema.safeParse({
            ...validClaim,
            contactPhone: '',
            contactEmail: '',
        });
        expect(result.success).toBe(false);
    });

    it('accepts an omitted optional contact channel', () => {
        const { contactEmail: _contactEmail, ...claimWithPhoneOnly } = validClaim;
        expect(ownershipClaimSchema.safeParse(claimWithPhoneOnly).success).toBe(true);
    });

    it('requires one to five evidence images', () => {
        expect(ownershipClaimSchema.safeParse({ ...validClaim, evidenceAssetTokens: [] }).success).toBe(false);
        expect(ownershipClaimSchema.safeParse({
            ...validClaim,
            evidenceAssetTokens: ['1', '2', '3', '4', '5', '6'],
        }).success).toBe(false);
    });

    it('keeps existing and new Location commands discriminated', () => {
        expect(createOwnershipSchema.safeParse({
            locationMode: 'existing', locationId: 'location-id', claim: validClaim,
        }).success).toBe(true);
        expect(createOwnershipSchema.safeParse({
            locationMode: 'new', location: { name: 'Quán Huế' }, claim: validClaim,
        }).success).toBe(true);
    });

    it('requires an actionable Admin review explanation', () => {
        expect(ownershipReviewSchema.safeParse({ reasonCode: 'other', reason: 'quá ngắn' }).success).toBe(false);
        expect(ownershipReviewSchema.safeParse({
            reasonCode: 'insufficient_evidence',
            reason: 'Vui lòng bổ sung ảnh biển hiệu và ảnh tại cơ sở.',
        }).success).toBe(true);
    });
});
