import type { Corner } from "./OverlayPosition.ts";

export type ObjectFitMode = "cover" | "fit";
let currentFitMode: ObjectFitMode = "cover";

export function setFitMode(mode: ObjectFitMode): void {
	currentFitMode = mode;
}

export function getFitMode(): ObjectFitMode {
	return currentFitMode;
}

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
 * In "cover" mode: Replicates object-fit: cover behavior to match what the user sees.
 * In "fit" mode: Captures the full video frame without cropping.
 */
export function drawVideoToCanvas(
	video: HTMLVideoElement,
	flipHorizontal = false,
): OffscreenCanvas {
	// Get viewport dimensions (what user sees) and source dimensions (full stream)
	const viewportWidth = video.clientWidth;
	const viewportHeight = video.clientHeight;
	const srcWidth = video.videoWidth;
	const srcHeight = video.videoHeight;

	let width: number;
	let height: number;
	let sx: number, sy: number, sw: number, sh: number;

	if (currentFitMode === "cover") {
		// Cover mode: Use viewport aspect ratio for output, but scale up for quality
		const scale = Math.max(
			srcWidth / viewportWidth,
			srcHeight / viewportHeight,
			1,
		);

		width = Math.round(viewportWidth * scale);
		height = Math.round(viewportHeight * scale);

		// Calculate which portion of the source video is visible (object-fit: cover)
		({ sx, sy, sw, sh } = calculateCoverCrop(
			srcWidth,
			srcHeight,
			viewportWidth,
			viewportHeight,
		));
	} else {
		// Fit mode: Use full video dimensions without cropping
		width = srcWidth;
		height = srcHeight;

		// Draw entire video frame
		sx = 0;
		sy = 0;
		sw = srcWidth;
		sh = srcHeight;
	}

	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext("2d")!;

	ctx.save();
	if (flipHorizontal) {
		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1);
	}
	// Draw the video frame to canvas
	ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
	ctx.restore();

	return canvas;
}

/**
 * Draw a rounded rectangle path (helper for overlay drawing)
 */
function roundedRectPath(
	ctx: OffscreenCanvasRenderingContext2D,
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
 * Draw an overlay image with rounded corners, soft shadow, and subtle border
 * Matches the Polaroid Noir styling from CSS
 * @param viewportWidth - The viewport width used to scale positioning to match CSS preview
 * @param corner - Which corner to position the overlay in (default: top-left)
 */
export function drawOverlayOnMainCanvas(
	mainImage: OffscreenCanvas,
	overlayImage: CanvasImageSource,
	viewportWidth: number,
	corner: Corner = "top-left",
): void {
	// Calculate scale factor to match CSS preview positioning
	// CSS uses fixed 20px offset relative to viewport, but canvas is scaled up
	const scale = mainImage.width / viewportWidth;

	const overlayWidth = mainImage.width * 0.25;
	// Overlay height matches main video's viewport aspect ratio
	const overlayHeight = (mainImage.height / mainImage.width) * overlayWidth;
	const margin = 20 * scale;
	const bottomMargin = 100 * scale; // matches CSS for bottom corners
	const borderRadius = 16 * scale; // matches CSS border-radius: 16px

	// Calculate position based on corner
	let overlayX: number;
	let overlayY: number;

	switch (corner) {
		case "top-left":
			overlayX = margin;
			overlayY = margin;
			break;
		case "top-right":
			overlayX = mainImage.width - overlayWidth - margin;
			overlayY = margin;
			break;
		case "bottom-left":
			overlayX = margin;
			overlayY = mainImage.height - overlayHeight - bottomMargin;
			break;
		case "bottom-right":
			overlayX = mainImage.width - overlayWidth - margin;
			overlayY = mainImage.height - overlayHeight - bottomMargin;
			break;
	}

	const ctx = mainImage.getContext("2d")!;

	// Draw shadow first (matches CSS: 0 8px 32px rgba(0, 0, 0, 0.6))
	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
	ctx.shadowBlur = 32 * scale;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 8 * scale;

	// Draw a filled rounded rect to cast the shadow
	roundedRectPath(
		ctx,
		overlayX,
		overlayY,
		overlayWidth,
		overlayHeight,
		borderRadius,
	);
	ctx.fillStyle = "#000"; // Color doesn't matter, just need to fill for shadow
	ctx.fill();
	ctx.restore();

	// Clip and draw image
	ctx.save();
	roundedRectPath(
		ctx,
		overlayX,
		overlayY,
		overlayWidth,
		overlayHeight,
		borderRadius,
	);
	ctx.clip();
	ctx.drawImage(overlayImage, overlayX, overlayY, overlayWidth, overlayHeight);
	ctx.restore();
}

/**
 * Convert a canvas to a PNG blob
 */
export function canvasToBlob(canvas: OffscreenCanvas): Promise<Blob> {
	return canvas.convertToBlob({
		type: "image/jpeg",
		quality: 0.75,
	});
}
