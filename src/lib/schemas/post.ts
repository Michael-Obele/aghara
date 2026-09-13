// Shared Valibot schemas — used by BOTH remote functions and REST routes.
import * as v from 'valibot';

export const TargetSchema = v.object({
	channelAccountId: v.pipe(v.string(), v.uuid()),
	runAt: v.pipe(v.string(), v.isoTimestamp()) // ISO 8601, must be future (checked in service)
});

export const CreatePostSchema = v.object({
	// body is the canonical full text. A generous cap because thread platforms
	// auto-split long text (and a thread's joined segments can exceed 2000).
	body: v.pipe(v.string(), v.minLength(1), v.maxLength(20000)),
	// Explicit thread segments. Empty => providers auto-split `body` to fit.
	segments: v.optional(v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(2000))), []),
	mediaUrls: v.optional(v.array(v.pipe(v.string(), v.url())), []),
	// IANA timezone the schedule was composed in. Metadata only — `runAt` is an
	// absolute instant; the service validates/canonicalizes this value.
	timezone: v.optional(v.pipe(v.string(), v.minLength(1)), 'UTC'),
	targets: v.pipe(v.array(TargetSchema), v.minLength(1))
});

export const PublishNowSchema = v.object({
	scheduledId: v.pipe(v.string(), v.uuid())
});
export const CancelSchema = PublishNowSchema;

export const RetrySchema = v.object({
	scheduledId: v.pipe(v.string(), v.uuid()),
	runAt: v.pipe(v.string(), v.isoTimestamp()) // ISO 8601, must be future (checked in service)
});

// Edit a post that hasn't been sent yet (queued or failed). Body/segments live on
// the shared post row, so every unsent copy updates together; `runAt` optionally
// reschedules the row while it is still queued (failed rows pick a time via Retry).
export const UpdatePostSchema = v.object({
	scheduledId: v.pipe(v.string(), v.uuid()),
	body: v.pipe(v.string(), v.minLength(1), v.maxLength(20000)),
	segments: v.optional(v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(2000))), []),
	runAt: v.optional(v.pipe(v.string(), v.isoTimestamp()))
});

export type CreatePostInput = v.InferOutput<typeof CreatePostSchema>;
export type TargetInput = v.InferOutput<typeof TargetSchema>;
export type RetryInput = v.InferOutput<typeof RetrySchema>;
export type UpdatePostInput = v.InferOutput<typeof UpdatePostSchema>;
