/**
 * Detect iOS devices (iPhone, iPad, iPod)
 * Uses user agent string and maxTouchPoints for iPad detection
 */
export const isIOS =
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
