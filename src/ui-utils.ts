import * as elements from "./elements.ts";

/**
 * Disable the switch button (for single camera mode)
 */
export function disableSwitchButton(): void {
	elements.switchBtn.disabled = true;
	elements.switchBtn.style.opacity = "0.5";
	elements.switchBtn.style.cursor = "not-allowed";
}
