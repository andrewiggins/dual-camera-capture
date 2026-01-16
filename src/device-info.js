import { debugLog } from "./debug.js";

/**
 * Device detection singleton
 * Detects iOS devices and available cameras
 */
export const isIOS =
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const hasMultipleCameras = false;

/**
 * Detect available video input devices
 * @returns {Promise<MediaDeviceInfo[]>}
 */
export async function detectCameras() {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const videoDevices = devices.filter((d) => d.kind === "videoinput");
		this.hasMultipleCameras = videoDevices.length >= 2;
		debugLog(`Found ${videoDevices.length} video input device(s):`);
		videoDevices.forEach((d, i) => {
			debugLog(
				`  Device ${i}: ${d.label || "(no label)"} [${d.deviceId.slice(
					0,
					8
				)}...]`
			);
		});
		return videoDevices;
	} catch (e) {
		debugLog("Failed to enumerate devices", e, true);
		return [];
	}
}
