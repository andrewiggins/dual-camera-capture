async function resizeImage(
	file: ImageBitmapSource,
	maxWidth: number,
	maxHeight: number,
	options: {
		quality?: number;
		type?: string;
		highQuality?: boolean;
		progressiveFactor?: number;
	} = {},
) {
	const {
		quality = 0.9,
		type = "image/jpeg",
		highQuality = false,
		progressiveFactor = 0.5, // scale down in steps (0.5 = half each step)
	} = options;

	// --- 1. Decode image with EXIF orientation handling ---
	const bitmap = await createImageBitmap(file, {
		imageOrientation: "from-image", // auto-rotate based on EXIF
	});

	let { width, height } = bitmap;

	// --- 2. Compute final target size ---
	const scale = Math.min(maxWidth / width, maxHeight / height, 1);
	const targetWidth = Math.round(width * scale);
	const targetHeight = Math.round(height * scale);

	// --- 3. Progressive downscaling using OffscreenCanvas ---
	let currentBitmap = bitmap;

	while (width * progressiveFactor > targetWidth) {
		const stepWidth = Math.round(width * progressiveFactor);
		const stepHeight = Math.round(height * progressiveFactor);

		const stepCanvas = new OffscreenCanvas(stepWidth, stepHeight);
		const stepCtx = stepCanvas.getContext("2d")!;

		if (highQuality) {
			stepCtx.imageSmoothingEnabled = true;
			stepCtx.imageSmoothingQuality = "high";
		}

		stepCtx.drawImage(currentBitmap, 0, 0, stepWidth, stepHeight);

		currentBitmap = await createImageBitmap(stepCanvas);
		width = stepWidth;
		height = stepHeight;
	}

	// --- 4. Final resize to target dimensions ---
	const finalCanvas = new OffscreenCanvas(targetWidth, targetHeight);
	const finalCtx = finalCanvas.getContext("2d")!;

	if (highQuality) {
		finalCtx.imageSmoothingEnabled = true;
		finalCtx.imageSmoothingQuality = "high";
	}

	finalCtx.drawImage(currentBitmap, 0, 0, targetWidth, targetHeight);

	// --- 5. Export as Blob ---
	const blob = await finalCanvas.convertToBlob({
		type,
		quality,
	});

	return blob;
}
