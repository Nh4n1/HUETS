import { z } from 'zod';

const optionalMoney = z.number().min(0).nullable().optional().transform((value) => value ?? null);

export const voucherInputSchema = z.object({
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(1).max(300),
    benefit: z.object({
        type: z.enum(['percentage', 'fixed_amount']),
        value: z.number().positive(),
        maxDiscountAmount: optionalMoney,
        minOrderAmount: optionalMoney,
    }),
    terms: z.string().trim().min(20).max(2000),
    claimStartAt: z.coerce.date(),
    claimEndAt: z.coerce.date(),
    redeemUntil: z.coerce.date(),
    totalQuantity: z.number().int().positive(),
}).strict().superRefine((voucher, context) => {
    if (voucher.benefit.type === 'percentage' && voucher.benefit.value > 100) {
        context.addIssue({ code: 'custom', path: ['benefit', 'value'], message: 'Mức giảm phần trăm không được vượt quá 100.' });
    }
    if (voucher.claimEndAt <= voucher.claimStartAt) {
        context.addIssue({ code: 'custom', path: ['claimEndAt'], message: 'Thời gian kết thúc nhận phải sau thời gian bắt đầu.' });
    }
    if (voucher.redeemUntil < voucher.claimEndAt) {
        context.addIssue({ code: 'custom', path: ['redeemUntil'], message: 'Hạn sử dụng không được trước thời gian kết thúc nhận.' });
    }
});

const voucherPatchFields = {
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(1).max(300),
    benefit: z.object({
        type: z.enum(['percentage', 'fixed_amount']),
        value: z.number().positive(),
        maxDiscountAmount: optionalMoney,
        minOrderAmount: optionalMoney,
    }),
    terms: z.string().trim().min(20).max(2000),
    claimStartAt: z.coerce.date(),
    claimEndAt: z.coerce.date(),
    redeemUntil: z.coerce.date(),
    totalQuantity: z.number().int().positive(),
};

export const voucherPatchSchema = z.object(voucherPatchFields).strict().partial().refine(
    (value) => Object.keys(value).length > 0,
    { message: 'Cần cung cấp ít nhất một nội dung cập nhật.' },
);
