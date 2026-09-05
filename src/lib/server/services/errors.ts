// Typed application errors — REST routes map these to { error, message } JSON.
export class AppError extends Error {
	code: string;
	status: number;

	constructor(code: string, message: string, status = 400) {
		super(message);
		this.name = 'AppError';
		this.code = code;
		this.status = status;
	}
}

export const Errors = {
	validation: (msg = 'Invalid input') => new AppError('VALIDATION_ERROR', msg, 400),
	unauthorized: (msg = 'Unauthorized') => new AppError('UNAUTHORIZED', msg, 401),
	notFound: (msg = 'Not found') => new AppError('NOT_FOUND', msg, 404),
	conflict: (msg = 'Conflict') => new AppError('CONFLICT', msg, 409),
	limitExceeded: (msg = 'Plan limit exceeded') => new AppError('LIMIT_EXCEEDED', msg, 402),
	notQueued: (msg = 'Only queued items can be published or canceled') =>
		new AppError('NOT_QUEUED', msg, 409),
	pastRunAt: (msg = 'run_at must be in the future') => new AppError('PAST_RUN_AT', msg, 400),
	provider: (msg = 'Provider error') => new AppError('PROVIDER_ERROR', msg, 502)
} as const;
