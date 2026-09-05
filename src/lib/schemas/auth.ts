// Shared Valibot schemas for email/password auth (remote forms).
import * as v from 'valibot';

export const SignInSchema = v.object({
	email: v.pipe(v.string(), v.email('Enter a valid email')),
	password: v.pipe(v.string(), v.minLength(1, 'Enter your password'))
});

export const SignUpSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, 'Enter your name')),
	email: v.pipe(v.string(), v.email('Enter a valid email')),
	password: v.pipe(v.string(), v.minLength(8, 'Password must be at least 8 characters'))
});

export type SignInInput = v.InferOutput<typeof SignInSchema>;
export type SignUpInput = v.InferOutput<typeof SignUpSchema>;
