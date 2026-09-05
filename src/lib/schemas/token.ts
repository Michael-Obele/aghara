// Shared Valibot schemas for API token management.
import * as v from 'valibot';

export const CreateTokenSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(50))
});

export type CreateTokenInput = v.InferOutput<typeof CreateTokenSchema>;
