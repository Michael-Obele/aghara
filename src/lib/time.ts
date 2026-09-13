// Shared time formatting — 12-hour by default, 24-hour opt-in via Settings.
// Pure functions so they're safe to call during SSR; the cookie write is
// browser-only and only invoked from event handlers.
// Local ↔ instant math goes through Temporal (temporal-polyfill) so timezone
// handling and DST edges are explicit instead of relying on Date's implicit zone.
import { Temporal } from 'temporal-polyfill';

export type TimeFormat = '12h' | '24h';

export const TIME_FORMAT_COOKIE = 'time_format';

export function formatDateTime(value: Date | string, format: TimeFormat = '12h'): string {
	return new Date(value).toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: format === '12h'
	});
}

/** Persist the preference for this browser (call from event handlers only). */
export function setTimeFormatCookie(format: TimeFormat): void {
	document.cookie = `${TIME_FORMAT_COOKIE}=${format}; path=/; max-age=31536000; samesite=lax`;
}

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/**
 * Human-readable relative time — "in 3 hours", "5 minutes ago", "yesterday".
 * Zero-dependency via the native Intl.RelativeTimeFormat.
 */
export function formatRelativeTime(value: Date | string, now: Date = new Date()): string {
	const diffMs = new Date(value).getTime() - now.getTime();
	const diffSec = Math.round(diffMs / 1000);
	const absSec = Math.abs(diffSec);

	if (absSec < 60) return relativeFormatter.format(diffSec, 'second');
	const minutes = Math.round(diffSec / 60);
	if (absSec < 3600) return relativeFormatter.format(minutes, 'minute');
	const hours = Math.round(diffSec / 3600);
	if (absSec < 86_400) return relativeFormatter.format(hours, 'hour');
	const days = Math.round(diffSec / 86_400);
	if (absSec < 604_800) return relativeFormatter.format(days, 'day');
	const weeks = Math.round(diffSec / 604_800);
	if (absSec < 2_592_000) return relativeFormatter.format(weeks, 'week');
	const months = Math.round(diffSec / 2_592_000);
	if (absSec < 31_536_000) return relativeFormatter.format(months, 'month');
	return relativeFormatter.format(Math.round(diffSec / 31_536_000), 'year');
}

/** IANA timezone of the current device — call in the browser (compose, dialogs). */
export function getBrowserTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

/**
 * Convert a datetime-local value ("YYYY-MM-DDTHH:mm") — a wall-clock time in
 * `timeZone` — to an absolute ISO instant. DST-safe via Temporal: ambiguous or
 * skipped local times resolve deterministically instead of drifting.
 */
export function localToInstant(localValue: string, timeZone: string): string {
	return Temporal.PlainDateTime.from(localValue).toZonedDateTime(timeZone).toInstant().toString();
}

/** Convert an absolute ISO instant back to a datetime-local value in `timeZone`. */
export function instantToLocalInput(iso: string, timeZone: string): string {
	return Temporal.Instant.from(iso)
		.toZonedDateTimeISO(timeZone)
		.toPlainDateTime()
		.toString({ smallestUnit: 'minute' });
}

/** True when a datetime-local wall-clock in `timeZone` is at/before now (invalid → true). */
export function isLocalTimePast(localValue: string, timeZone: string): boolean {
	try {
		const zoned = Temporal.PlainDateTime.from(localValue).toZonedDateTime(timeZone);
		return zoned.epochMilliseconds <= Temporal.Now.instant().epochMilliseconds;
	} catch {
		return true;
	}
}
