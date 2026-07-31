import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

export const hashPassword = (plainPassword: string) => bcrypt.hash(plainPassword, SALT_ROUNDS);

export const comparePassword = (plainPassword: string, passwordHash: string) =>
    bcrypt.compare(plainPassword, passwordHash);

// used to store opaque tokens (refresh token, reset token) as a lookup-safe hash
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const generateOpaqueToken = () => crypto.randomBytes(32).toString('hex');
