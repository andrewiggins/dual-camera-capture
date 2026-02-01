import { statusMessage, statusTimeout } from "./state/uiSignals.ts";

/**
 * Show a status message
 * @param duration - Auto-hide after duration (ms), null for permanent
 */
export function showStatus(
	message: string,
	duration: number | null = null,
): void {
	// Clear any pending hide timeout to prevent flickering
	if (statusTimeout.value !== null) {
		clearTimeout(statusTimeout.value);
		statusTimeout.value = null;
	}

	statusMessage.value = message;

	if (duration) {
		statusTimeout.value = window.setTimeout(() => {
			statusMessage.value = null;
			statusTimeout.value = null;
		}, duration);
	}
}
