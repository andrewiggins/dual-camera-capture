import * as elements from "./elements.ts";

/**
 * Update overlay aspect ratio to match the visible viewport.
 * Uses the main video element's rendered dimensions (what the user sees)
 * rather than the video stream's native aspect ratio.
 */
export function updateOverlayDimensions(): void {
	const video = elements.mainVideo;
	// Use the element's rendered size (viewport), not video stream dimensions
	const width = video.clientWidth;
	const height = video.clientHeight;
	if (width === 0 || height === 0) return;

	const aspectRatio = width / height;

	// Set CSS custom property for aspect ratio on container
	const container = video.parentElement;
	if (container) {
		container.style.setProperty("--overlay-aspect-ratio", `${aspectRatio}`);
	}
}

/**
 * Show a status message
 * @param duration - Auto-hide after duration (ms), null for permanent
 */
export function showStatus(message: string, duration: number | null = null): void {
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
