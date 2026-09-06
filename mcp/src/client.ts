// Thin REST client for the Aghara API. No business logic — just fetch + Bearer.
// Base URL is read from AGHARA_BASE_URL so it can be swapped between dev and prod.

const BASE_URL = (process.env.AGHARA_BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const TOKEN = process.env.AGHARA_API_TOKEN ?? '';

export class ApiError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly status: number
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export async function api<T = Record<string, unknown>>(
	path: string,
	init: { method?: string; body?: unknown } = {}
): Promise<T> {
	const headers: Record<string, string> = { accept: 'application/json' };
	if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;
	if (init.body !== undefined) headers['content-type'] = 'application/json';

	const res = await fetch(`${BASE_URL}${path}`, {
		method: init.method ?? 'GET',
		headers,
		body: init.body !== undefined ? JSON.stringify(init.body) : undefined
	});

	const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;

	if (!res.ok) {
		throw new ApiError(
			data?.error ?? 'API_ERROR',
			data?.message ?? `HTTP ${res.status}`,
			res.status
		);
	}
	return (data ?? {}) as T;
}
