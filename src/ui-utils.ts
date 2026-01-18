import * as elements from "./elements.ts";

/**
 * Show a status message
 * @param duration - Auto-hide after duration (ms), null for permanent
 */
export function showStatus(
	message: string,
	duration: number | null = null,
): void {
	elements.status.textContent = message;
	elements.status.classList.add("show");

	if (duration) {
		setTimeout(() => {
			elements.status.classList.remove("show");
		}, duration);
	}
}

/**
 * Disable the switch button (for single camera mode)
 */
export function disableSwitchButton(): void {
	elements.switchBtn.disabled = true;
	elements.switchBtn.style.opacity = "0.5";
	elements.switchBtn.style.cursor = "not-allowed";
}
