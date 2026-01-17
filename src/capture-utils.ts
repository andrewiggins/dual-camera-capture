import { debugLog } from "./debug.ts";
import type { FacingMode } from "./types.ts";

/**
 * Video constraints for high resolution capture
 */
export const VIDEO_CONSTRAINTS = {
	width: { ideal: 4096 },
	height: { ideal: 2160 },
};

/**
 * Draw a video frame to a canvas, optionally flipping horizontally
 */
export function drawVideoToCanvas(
	video: HTMLVideoElement,
	canvas: HTMLCanvasElement,
	flipHorizontal = false,
): CanvasRenderingContext2D {
	const ctx = canvas.getContext("2d")!;
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;

	ctx.save();
	if (flipHorizontal) {
		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1);
	}
	ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
	ctx.restore();

	return ctx;
}

/**
 * Draw a rounded rectangle path (helper for overlay drawing)
 */
export function roundedRectPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): void {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

/**
 * Draw an overlay image with rounded corners and border
 */
export function drawRoundedOverlay(
	ctx: CanvasRenderingContext2D,
	image: CanvasImageSource,
	x: number,
	y: number,
	width: number,
	height: number,
	borderRadius: number,
): void {
	ctx.save();
	roundedRectPath(ctx, x, y, width, height, borderRadius);

	// Draw black border
	ctx.strokeStyle = "#000";
	ctx.lineWidth = 6;
	ctx.stroke();

	// Clip and draw image
	ctx.clip();
	ctx.drawImage(image, x, y, width, height);
	ctx.restore();
}

/**
 * Draw an error overlay when second camera is unavailable
 */
export function drawErrorOverlay(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	borderRadius: number,
): void {
	const height = width * (4 / 3);

	ctx.save();
	roundedRectPath(ctx, x, y, width, height, borderRadius);

	ctx.fillStyle = "rgba(40, 40, 40, 0.95)";
	ctx.fill();

	ctx.strokeStyle = "#ff6b6b";
	ctx.lineWidth = 6;
	ctx.stroke();

	ctx.fillStyle = "#fff";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "bold 40px Arial";
	ctx.fillText("\u26a0\ufe0f", x + width / 2, y + height / 2 - 20);
	ctx.font = "14px Arial";
	ctx.fillText("Second camera", x + width / 2, y + height / 2 + 20);
	ctx.fillText("not available", x + width / 2, y + height / 2 + 38);
	ctx.restore();
}

/**
 * Download a canvas as a PNG image
 */
export function downloadCanvas(canvas: HTMLCanvasElement): Promise<void> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error("Failed to create blob"));
				return;
			}

			debugLog("Blob created", { size: blob.size, type: blob.type });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `dual-camera-${Date.now()}.png`;
			debugLog("Initiating download", { filename: a.download });
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			resolve();
		}, "image/png");
	});
}

/**
 * Get a camera stream with the specified facing mode
 */
async function getCamera(facingMode: FacingMode): Promise<MediaStream> {
	const constraints = {
		video: {
			...VIDEO_CONSTRAINTS,
			facingMode:
				facingMode === "environment" ? { exact: "environment" } : "user",
		},
		audio: false,
	};
	return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Get a camera stream by device ID
 */
export async function getCameraByDeviceId(
	deviceId: string,
): Promise<MediaStream> {
	const constraints = {
		video: {
			...VIDEO_CONSTRAINTS,
			deviceId: { exact: deviceId },
		},
		audio: false,
	};
	return navigator.mediaDevices.getUserMedia(constraints);
}

export interface CameraResult {
	stream: MediaStream;
	deviceId: string;
	usedFallback: boolean;
}

/**
 * Get a camera stream with fallback to any available camera by deviceId.
 * If facingMode fails, tries to get any other camera not in excludeDeviceIds.
 * Returns { stream, deviceId, usedFallback } or null if no camera available.
 */
export async function getCameraWithFallback(
	facingMode: FacingMode,
	excludeDeviceIds: string[] = [],
): Promise<CameraResult | null> {
	// Try the requested facingMode first
	try {
		const stream = await getCamera(facingMode);
		const deviceId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? "";
		debugLog(`Got camera with facingMode ${facingMode}`, { deviceId });
		return { stream, deviceId, usedFallback: false };
	} catch (e) {
		debugLog(`facingMode ${facingMode} failed, trying fallback`, {
			name: (e as Error).name,
			message: (e as Error).message,
		});
	}

	// Fallback: enumerate devices and try any available camera not already in use
	return getFallbackCamera(excludeDeviceIds);
}

/**
 * Try to get any available camera by deviceId, excluding specified deviceIds.
 */
async function getFallbackCamera(
	excludeDeviceIds: string[],
): Promise<CameraResult | null> {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const videoDevices = devices.filter((d) => d.kind === "videoinput");

		for (const device of videoDevices) {
			if (excludeDeviceIds.includes(device.deviceId)) {
				debugLog(
					`Skipping device ${device.deviceId.slice(0, 8)}... (already in use)`,
				);
				continue;
			}

			try {
				const stream = await getCameraByDeviceId(device.deviceId);
				debugLog(
					`Fallback succeeded with deviceId ${device.deviceId.slice(0, 8)}...`,
				);
				return { stream, deviceId: device.deviceId, usedFallback: true };
			} catch (e) {
				debugLog(`Fallback device ${device.deviceId.slice(0, 8)}... failed`, {
					name: (e as Error).name,
					message: (e as Error).message,
				});
			}
		}
	} catch (e) {
		debugLog("Failed to enumerate devices for fallback", e, true);
	}

	return null;
}

export interface DualCameraResult {
	back: CameraResult | null;
	front: CameraResult | null;
}

/**
 * Get both cameras, trying facingMode for each first, then falling back to
 * any available cameras by deviceId.
 *
 * This ensures we don't accidentally grab a camera via fallback that would
 * have worked for the other facingMode.
 */
export async function getDualCameras(): Promise<DualCameraResult> {
	let back: CameraResult | null = null;
	let front: CameraResult | null = null;
	const usedDeviceIds: string[] = [];

	// Step 1: Try to get both cameras by facingMode first
	try {
		const stream = await getCamera("environment");
		const deviceId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? "";
		back = { stream, deviceId, usedFallback: false };
		usedDeviceIds.push(deviceId);
		debugLog("Got back camera with facingMode", { deviceId });
	} catch (e) {
		debugLog("Back camera facingMode failed", {
			name: (e as Error).name,
			message: (e as Error).message,
		});
	}

	try {
		const stream = await getCamera("user");
		const deviceId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? "";
		front = { stream, deviceId, usedFallback: false };
		usedDeviceIds.push(deviceId);
		debugLog("Got front camera with facingMode", { deviceId });
	} catch (e) {
		debugLog("Front camera facingMode failed", {
			name: (e as Error).name,
			message: (e as Error).message,
		});
	}

	// Step 2: For any that failed, try fallback by deviceId
	if (!back) {
		debugLog("Trying fallback for back camera");
		back = await getFallbackCamera(usedDeviceIds);
		if (back) {
			usedDeviceIds.push(back.deviceId);
		}
	}

	if (!front) {
		debugLog("Trying fallback for front camera");
		front = await getFallbackCamera(usedDeviceIds);
	}

	debugLog("getDualCameras result", {
		hasBack: !!back,
		hasFront: !!front,
		backUsedFallback: back?.usedFallback,
		frontUsedFallback: front?.usedFallback,
	});

	return { back, front };
}

/**
 * Stop all tracks in a media stream
 */
export function stopStream(stream: MediaStream | null): void {
	if (stream) {
		stream.getTracks().forEach((track) => track.stop());
	}
}
