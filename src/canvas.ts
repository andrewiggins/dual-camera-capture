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
	flipHorizontal = false,
): OffscreenCanvas {
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

	const width = Math.round(viewportWidth * scale);
	const height = Math.round(viewportHeight * scale);

	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext("2d")!;

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
 * Draw an overlay image with rounded corners and border
 * @param viewportWidth - The viewport width used to scale positioning to match CSS preview
 */
export function drawOverlayOnMainCanvas(
	mainImage: OffscreenCanvas,
	overlayImage: CanvasImageSource,
	viewportWidth: number,
): void {
	// Calculate scale factor to match CSS preview positioning
	// CSS uses fixed 20px offset relative to viewport, but canvas is scaled up
	const scale = mainImage.width / viewportWidth;

	const overlayWidth = mainImage.width * 0.25;
	// Overlay height matches main video's viewport aspect ratio
	const overlayHeight = (mainImage.height / mainImage.width) * overlayWidth;
	const overlayX = 20 * scale;
	const overlayY = 20 * scale;
	const borderRadius = 12 * scale;

	const ctx = mainImage.getContext("2d")!;

	ctx.save();
	roundedRectPath(
		ctx,
		overlayX,
		overlayY,
		overlayWidth,
		overlayHeight,
		borderRadius,
	);

	// Draw black border (scaled to match CSS preview)
	ctx.strokeStyle = "#000";
	ctx.lineWidth = 6 * scale;
	ctx.stroke();

	// Clip and draw image
	ctx.clip();
	ctx.drawImage(overlayImage, overlayX, overlayY, overlayWidth, overlayHeight);
	ctx.restore();
}

/**
 * Convert a canvas to a PNG blob
 */
export function canvasToBlob(canvas: OffscreenCanvas): Promise<Blob> {
	return canvas.convertToBlob({
		type: "image/png",
		quality: 1.0,
	});
}
