/*

⚡ Optimized resizeCameraFrame for live camera capture

Key differences from the previous version

- Accepts a video element or ImageBitmap instead of a File
- Removes EXIF handling
- Reuses OffscreenCanvas instances to avoid GC churn
- Uses createImageBitmap(video) for fast frame extraction
- Keeps progressive downscaling for quality
- Designed to run at capture time, not file‑load time


🧠 Why this version is ideal for live capture

✔ No EXIF decoding
Camera frames don’t contain EXIF orientation — the browser already gives you the correct orientation.

✔ Reuses OffscreenCanvas
Avoids allocating new canvases per frame, which is critical for performance.

✔ Uses createImageBitmap(video)
This is the fastest way to snapshot a video frame.

✔ Progressive downscaling
Still important for high‑resolution sensors (e.g., 12–48 MP).

✔ Works inside a Web Worker
Just move the resizer into a worker and pass the video frame as an ImageBitmap.

🧹 Cleaning up ImageBitmaps

✔ Prevents GPU memory leaks
Every ImageBitmap is tracked and closed in a finally block.

✔ Safe even if an exception occurs
If createImageBitmap fails or the canvas throws, cleanup still runs.

✔ Works for both:
resizeCameraFrame(video)

resizeCameraFrame(existingImageBitmap)

✔ Reuses canvases for performance
Only bitmaps are recreated; canvases persist.

*/

export function createCameraResizer(
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
		progressiveFactor = 0.5,
	} = options;

	// Reusable canvases to avoid allocations
	let workCanvas: OffscreenCanvas | null = null;
	let finalCanvas: OffscreenCanvas | null = null;

	return async function resizeCameraFrame(
		videoOrBitmap: HTMLVideoElement | ImageBitmap,
	): Promise<Blob> {
		let sourceBitmap: ImageBitmap | null = null;
		let currentBitmap: ImageBitmap | null = null;
		const bitmapsToClose: ImageBitmap[] = [];

		try {
			// --- 1. Extract bitmap from video if needed ---
			sourceBitmap =
				videoOrBitmap instanceof ImageBitmap
					? videoOrBitmap
					: await createImageBitmap(videoOrBitmap);

			currentBitmap = sourceBitmap;
			bitmapsToClose.push(sourceBitmap);

			let width = currentBitmap.width;
			let height = currentBitmap.height;

			// --- 2. Compute target size ---
			const scale = Math.min(maxWidth / width, maxHeight / height, 1);
			const targetWidth = Math.round(width * scale);
			const targetHeight = Math.round(height * scale);

			// --- 3. Progressive downscaling ---
			while (width * progressiveFactor > targetWidth) {
				const stepWidth = Math.round(width * progressiveFactor);
				const stepHeight = Math.round(height * progressiveFactor);

				if (!workCanvas) {
					workCanvas = new OffscreenCanvas(stepWidth, stepHeight);
				} else {
					workCanvas.width = stepWidth;
					workCanvas.height = stepHeight;
				}

				const ctx = workCanvas.getContext("2d")!;
				if (highQuality) {
					ctx.imageSmoothingEnabled = true;
					ctx.imageSmoothingQuality = "high";
				}

				ctx.drawImage(currentBitmap, 0, 0, stepWidth, stepHeight);

				const nextBitmap = await createImageBitmap(workCanvas);
				bitmapsToClose.push(nextBitmap);

				currentBitmap = nextBitmap;
				width = stepWidth;
				height = stepHeight;
			}

			// --- 4. Final resize ---
			if (!finalCanvas) {
				finalCanvas = new OffscreenCanvas(targetWidth, targetHeight);
			} else {
				finalCanvas.width = targetWidth;
				finalCanvas.height = targetHeight;
			}

			const finalCtx = finalCanvas.getContext("2d")!;
			if (highQuality) {
				finalCtx.imageSmoothingEnabled = true;
				finalCtx.imageSmoothingQuality = "high";
			}

			finalCtx.drawImage(currentBitmap, 0, 0, targetWidth, targetHeight);

			// --- 5. Export ---
			const blob = await finalCanvas.convertToBlob({ type, quality });

			return blob;
		} finally {
			// --- 6. Cleanup: close ALL bitmaps ---
			for (const bmp of bitmapsToClose) {
				try {
					bmp.close && bmp.close();
				} catch {}
			}
		}
	};
}
