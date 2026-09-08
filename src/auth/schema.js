import { z } from 'zod';

const MIN_PASSWORD = 10;
const MAX_PASSWORD = 128;
const MAX_NAME = 80;

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD, `Password must be at least ${MIN_PASSWORD} characters`)
  .max(MAX_PASSWORD);

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(MAX_NAME),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(MAX_PASSWORD),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(MAX_PASSWORD),
  newPassword: passwordSchema,
});
