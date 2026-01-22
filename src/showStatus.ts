const status = document.getElementById("status") as HTMLDivElement;

let hideTimeout: number | null = null;

/**
 * Show a status message
 * @param duration - Auto-hide after duration (ms), null for permanent
 */
export function showStatus(
	message: string,
	duration: number | null = null,
): void {
	// Clear any pending hide timeout to prevent flickering
	if (hideTimeout !== null) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}

	status.textContent = message;
	status.classList.add("show");

	if (duration) {
		hideTimeout = window.setTimeout(() => {
			status.classList.remove("show");
			hideTimeout = null;
		}, duration);
	}
}
