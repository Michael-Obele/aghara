// Shared Valibot schemas — used by BOTH remote functions and REST routes.
import * as v from 'valibot';

export const TargetSchema = v.object({
	channelAccountId: v.pipe(v.string(), v.uuid()),
	runAt: v.pipe(v.string(), v.isoTimestamp()) // ISO 8601, must be future (checked in service)
});

export const CreatePostSchema = v.object({
	body: v.pipe(v.string(), v.minLength(1), v.maxLength(2000)),
	mediaUrls: v.optional(v.array(v.pipe(v.string(), v.url())), []),
	targets: v.pipe(v.array(TargetSchema), v.minLength(1))
});

export const PublishNowSchema = v.object({
	scheduledId: v.pipe(v.string(), v.uuid())
});
export const CancelSchema = PublishNowSchema;

export type CreatePostInput = v.InferOutput<typeof CreatePostSchema>;
export type TargetInput = v.InferOutput<typeof TargetSchema>;
