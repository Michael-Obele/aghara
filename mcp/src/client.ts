// Thin REST client for the Aghara API. No business logic — just fetch + Bearer.
// Runtime-agnostic: pass baseUrl/token explicitly so the same code runs on
// Bun (Fly.io, via process.env) and Cloudflare Workers (via env bindings).

export interface ApiConfig {
	baseUrl: string;
	token: string;
}

export function normalizeBaseUrl(raw: string): string {
	return (raw || 'http://localhost:5173').replace(/\/+$/, '');
}

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
	return defaultApi(path, init);
}

/** Create a bound `api()` caller for one runtime env (Workers uses this). */
export function createApi(config: ApiConfig) {
	const baseUrl = normalizeBaseUrl(config.baseUrl);
	const token = config.token ?? '';

	return async function boundApi<T = Record<string, unknown>>(
		path: string,
		init: { method?: string; body?: unknown } = {}
	): Promise<T> {
		const headers: Record<string, string> = { accept: 'application/json' };
		if (token) headers.authorization = `Bearer ${token}`;
		if (init.body !== undefined) headers['content-type'] = 'application/json';

		const res = await fetch(`${baseUrl}${path}`, {
			method: init.method ?? 'GET',
			headers,
			body: init.body !== undefined ? JSON.stringify(init.body) : undefined
		});

		const data = (await res.json().catch(() => null)) as {
			error?: string;
			message?: string;
		} | null;

		if (!res.ok) {
			throw new ApiError(
				data?.error ?? 'API_ERROR',
				data?.message ?? `HTTP ${res.status}`,
				res.status
			);
		}
		return (data ?? {}) as T;
	};
}

export type ApiFn = ReturnType<typeof createApi>;

// Legacy default for the Bun entry (reads process.env at import time).
// Worker entry must use createApi() with its env bindings instead.
const BASE_URL =
	typeof process !== 'undefined'
		? (process.env.AGHARA_BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, '')
		: 'http://localhost:5173';
const TOKEN = typeof process !== 'undefined' ? (process.env.AGHARA_API_TOKEN ?? '') : '';

async function defaultApi<T = Record<string, unknown>>(
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
