async function resizeImage(
	image: Blob | MediaSource,
	maxWidth: number,
	maxHeight: number,
	options: { quality?: number; type?: string; highQuality?: boolean } = {},
) {
	const {
		quality = 0.9, // JPEG/WebP quality
		type = "image/jpeg", // output format
		highQuality = false, // enable high-quality smoothing
	} = options;

	const img = new Image();
	img.src = URL.createObjectURL(image);
	await img.decode();

	const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
	const width = img.width * scale;
	const height = img.height * scale;

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d")!;

	if (highQuality) {
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";
	}

	ctx.drawImage(img, 0, 0, width, height);

	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), type, quality);
	});
}
