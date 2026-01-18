const status = document.getElementById("status") as HTMLDivElement;

/**
 * Show a status message
 * @param duration - Auto-hide after duration (ms), null for permanent
 */
export function showStatus(
	message: string,
	duration: number | null = null,
): void {
	status.textContent = message;
	status.classList.add("show");

	if (duration) {
		setTimeout(() => {
			status.classList.remove("show");
		}, duration);
	}
}
