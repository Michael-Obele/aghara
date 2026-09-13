// Server layout — reads the device-level time-format cookie so SSR renders the
// same clock style the client will (avoids hydration mismatch). The settings
// page writes this cookie and invalidates 'app:time-format' to refresh it live.
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies, depends }) => {
	depends('app:time-format');
	return { timeFormat: cookies.get('time_format') === '24h' ? '24h' : '12h' };
};
