// AES-256-GCM encrypt/decrypt for channel credentials at rest.
// APP_ENCRYPTION_KEY must be 32 bytes expressed as 64 hex chars.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';

/** Short, non-secret fingerprint of the active key — helps spot key mismatches. */
export function keyFingerprint(): string {
	const hex = env.APP_ENCRYPTION_KEY ?? '';
	return createHash('sha256').update(hex).digest('hex').slice(0, 8);
}

function getKey(): Buffer {
	const hex = env.APP_ENCRYPTION_KEY;
	if (!hex) throw new Error('APP_ENCRYPTION_KEY is not set');
	const key = Buffer.from(hex, 'hex');
	if (key.length !== 32) {
		throw new Error('APP_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
	}
	return key;
}

/** Encrypt a JSON string into `iv.authTag.ciphertext` (base64 segments). */
export function encrypt(plain: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
	const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	const out = [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(
		'.'
	);
	console.log(`[aghara] crypto.encrypt key=${keyFingerprint()} bytes=${plain.length}`);
	return out;
}

/** Decrypt a payload produced by `encrypt`. Throws on tampering (bad auth tag). */
export function decrypt(payload: string): string {
	const [ivB64, tagB64, dataB64] = payload.split('.');
	if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted payload');
	try {
		const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
		decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
		const decrypted = Buffer.concat([
			decipher.update(Buffer.from(dataB64, 'base64')),
			decipher.final()
		]);
		console.log(`[aghara] crypto.decrypt ok key=${keyFingerprint()}`);
		return decrypted.toString('utf8');
	} catch (err) {
		console.error(
			`[aghara] crypto.decrypt FAILED key=${keyFingerprint()} err=${err instanceof Error ? err.message : err}`
		);
		throw err;
	}
}

/** Convenience: encrypt an object (used by connectAccount). */
export function encryptObject<T extends object>(value: T): string {
	return encrypt(JSON.stringify(value));
}

/** Convenience: decrypt into a typed object (used by publisher). */
export function decryptObject<T extends object>(payload: string): T {
	return JSON.parse(decrypt(payload)) as T;
}
