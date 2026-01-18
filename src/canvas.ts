import { debugLog } from "./debug.ts";

/**
 * Calculate the source crop region for object-fit: cover behavior.
 * Returns the portion of the source that's visible in the viewport.
 */
function calculateCoverCrop(
	srcWidth: number,
	srcHeight: number,
	viewportWidth: number,
	viewportHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
	const srcAspect = srcWidth / srcHeight;
	const viewportAspect = viewportWidth / viewportHeight;

	let sx: number, sy: number, sw: number, sh: number;

	if (srcAspect > viewportAspect) {
		// Source is wider - crop horizontally
		sh = srcHeight;
		sw = srcHeight * viewportAspect;
		sx = (srcWidth - sw) / 2;
		sy = 0;
	} else {
		// Source is taller - crop vertically
		sw = srcWidth;
		sh = srcWidth / viewportAspect;
		sx = 0;
		sy = (srcHeight - sh) / 2;
	}

	return { sx, sy, sw, sh };
}

/**
 * Draw a video frame to a canvas, capturing only the visible viewport area.
 * Replicates object-fit: cover behavior to match what the user sees on screen.
 */
export function drawVideoToCanvas(
	video: HTMLVideoElement,
	canvas: HTMLCanvasElement,
	flipHorizontal = false,
): CanvasRenderingContext2D {
	const ctx = canvas.getContext("2d")!;

	// Get viewport dimensions (what user sees) and source dimensions (full stream)
	const viewportWidth = video.clientWidth;
	const viewportHeight = video.clientHeight;
	const srcWidth = video.videoWidth;
	const srcHeight = video.videoHeight;

	// Use viewport aspect ratio for output, but scale up for quality
	// Use the larger of viewport or source dimensions for better quality
	const scale = Math.max(
		srcWidth / viewportWidth,
		srcHeight / viewportHeight,
		1,
	);
	canvas.width = Math.round(viewportWidth * scale);
	canvas.height = Math.round(viewportHeight * scale);

	// Calculate which portion of the source video is visible (object-fit: cover)
	const { sx, sy, sw, sh } = calculateCoverCrop(
		srcWidth,
		srcHeight,
		viewportWidth,
		viewportHeight,
	);

	ctx.save();
	if (flipHorizontal) {
		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1);
	}
	// Draw only the visible portion of the video
	ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
	ctx.restore();

	return ctx;
}

/**
 * Draw a rounded rectangle path (helper for overlay drawing)
 */
function roundedRectPath(
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
 * Convert a canvas to a PNG blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error("Failed to create blob"));
				return;
			}
			debugLog("Blob created", { size: blob.size, type: blob.type });
			resolve(blob);
		}, "image/png");
	});
}
