import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'registrationId is invalid');

export const registerSchema = z.object({
    displayName: z.string().trim().min(2).max(80),
    email: z.string().trim().pipe(z.email()),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(1),
}).strict().refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
});

export const verifyRegistrationSchema = z.object({
    registrationId: objectIdSchema,
    code: z.string().regex(/^\d{6}$/, 'code must contain exactly 6 digits'),
}).strict();

export const resendRegistrationSchema = z.object({
    registrationId: objectIdSchema,
}).strict();

export const forgotPasswordSchema = z.object({
    email: z.string().trim().pipe(z.email()),
}).strict();

export const resendPasswordResetSchema = forgotPasswordSchema;

export const resetPasswordSchema = z.object({
    email: z.string().trim().pipe(z.email()),
    code: z.string().regex(/^\d{6}$/, 'code must contain exactly 6 digits'),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(1),
}).strict().refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyRegistrationInput = z.infer<typeof verifyRegistrationSchema>;
export type ResendRegistrationInput = z.infer<typeof resendRegistrationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
