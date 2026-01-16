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
export async function getCamera(facingMode: FacingMode): Promise<MediaStream> {
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
 * Stop all tracks in a media stream
 */
export function stopStream(stream: MediaStream | null): void {
	if (stream) {
		stream.getTracks().forEach((track) => track.stop());
	}
}
