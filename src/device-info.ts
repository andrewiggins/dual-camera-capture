import { debugLog } from "./debug.ts";

/**
 * Device detection singleton
 * Detects iOS devices and available cameras
 */
export const isIOS =
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * Detect available video input devices
 */
export async function detectCameras(): Promise<MediaDeviceInfo[]> {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const videoDevices = devices.filter((d) => d.kind === "videoinput");
		debugLog(`Found ${videoDevices.length} video input device(s):`);
		videoDevices.forEach((d, i) => {
			debugLog(
				`  Device ${i}: ${d.label || "(no label)"} [${d.deviceId.slice(0, 8)}...]`,
			);
		});
		return videoDevices;
	} catch (e) {
		debugLog("Failed to enumerate devices", e, true);
		return [];
	}
}
