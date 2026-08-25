import { Router } from 'express';
import * as authController from '../../controllers/auth.controller.ts';
import { createRateLimit } from '../../middlewares/rateLimit.middleware.ts';

const router = Router();

const registerRateLimit = createRateLimit({ windowMs: 15 * 60_000, maxRequests: 10 });
const verifyRateLimit = createRateLimit({ windowMs: 15 * 60_000, maxRequests: 30 });
const resendRateLimit = createRateLimit({ windowMs: 15 * 60_000, maxRequests: 10 });
const forgotPasswordRateLimit = createRateLimit({ windowMs: 15 * 60_000, maxRequests: 10 });
const passwordResetRateLimit = createRateLimit({ windowMs: 15 * 60_000, maxRequests: 30 });
const passwordResetResendRateLimit = createRateLimit({ windowMs: 15 * 60_000, maxRequests: 10 });

router.post('/register', registerRateLimit, authController.register);
router.post('/register/verify', verifyRateLimit, authController.verifyRegister);
router.post('/register/resend', resendRateLimit, authController.resendRegister);
router.post('/forgot-password', forgotPasswordRateLimit, authController.forgotPassword);
router.post('/forgot-password/resend', passwordResetResendRateLimit, authController.resendPasswordReset);
router.post('/reset-password', passwordResetRateLimit, authController.resetPassword);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
