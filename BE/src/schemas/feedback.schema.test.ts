import { describe, expect, it } from 'vitest';
import { adminFeedbackQuerySchema, createFeedbackSchema, updateFeedbackSchema } from './feedback.schema.ts';

describe('feedback schemas', () => {
    it('accepts a valid public feedback payload and defaults images', () => {
        expect(createFeedbackSchema.parse({
            type: 'usability',
            title: 'Khó tìm nút lưu',
            description: 'Nút lưu địa điểm chưa đủ nổi bật.',
        })).toMatchObject({ type: 'usability', imageAssetTokens: [] });
    });

    it('rejects fields controlled by the backend', () => {
        expect(() => createFeedbackSchema.parse({
            type: 'bug', title: 'Lỗi bản đồ', description: 'Bản đồ không hiển thị đúng.', status: 'resolved',
        })).toThrow();
    });

    it('rejects invalid type and short content', () => {
        expect(() => createFeedbackSchema.parse({ type: 'complaint', title: 'Lỗi', description: 'Ngắn' })).toThrow();
    });

    it('rejects more than three image tokens', () => {
        expect(() => createFeedbackSchema.parse({
            type: 'bug', title: 'Lỗi hiển thị', description: 'Màn hình đang hiển thị không đúng.', imageAssetTokens: ['1', '2', '3', '4'],
        })).toThrow();
    });

    it('validates optional contact email', () => {
        expect(() => createFeedbackSchema.parse({
            type: 'other', title: 'Liên hệ lại', description: 'Tôi muốn nhận thêm phản hồi.', contactEmail: 'not-an-email',
        })).toThrow();
    });

    it('coerces and bounds admin pagination', () => {
        expect(adminFeedbackQuerySchema.parse({ page: '2', pageSize: '50' })).toMatchObject({ page: 2, pageSize: 50 });
        expect(() => adminFeedbackQuerySchema.parse({ pageSize: '101' })).toThrow();
    });

    it('only accepts supported admin update fields', () => {
        expect(updateFeedbackSchema.parse({ status: 'reviewing', adminNote: 'Đang kiểm tra.' })).toMatchObject({ status: 'reviewing' });
        expect(() => updateFeedbackSchema.parse({ status: 'assigned' })).toThrow();
    });
});
