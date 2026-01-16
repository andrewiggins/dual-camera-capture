import * as elements from "./elements.js";

/**
 * Show a status message
 * @param {string} message
 * @param {number | null} duration - Auto-hide after duration (ms), null for permanent
 */
export function showStatus(message, duration = null) {
	elements.status.textContent = message;
	elements.status.classList.add("show");

	if (duration) {
		setTimeout(() => {
			elements.status.classList.remove("show");
		}, duration);
	}
}

/**
 * Update CSS classes for camera orientation (front camera mirroring)
 * @param {boolean} isMainFront
 * @param {boolean} hasOverlay
 */
export function updateCameraOrientation(isMainFront, hasOverlay) {
	if (isMainFront) {
		elements.mainVideo.classList.add("front-camera");
	} else {
		elements.mainVideo.classList.remove("front-camera");
	}

	if (hasOverlay) {
		if (isMainFront) {
			elements.overlayVideo.classList.remove("front-camera");
		} else {
			elements.overlayVideo.classList.add("front-camera");
		}
	}
}

/**
 * Disable the switch button (for single camera mode)
 */
export function disableSwitchButton() {
	elements.switchBtn.disabled = true;
	elements.switchBtn.style.opacity = "0.5";
	elements.switchBtn.style.cursor = "not-allowed";
}
