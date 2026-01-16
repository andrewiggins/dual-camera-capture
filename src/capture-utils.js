import { debugLog } from "./debug.js";

/**
 * Video constraints for high resolution capture
 */
export const VIDEO_CONSTRAINTS = {
	width: { ideal: 4096 },
	height: { ideal: 2160 },
};

/**
 * Shared utilities for camera capture and canvas operations
 */
export const CaptureUtils = {
	/**
	 * Draw a video frame to a canvas, optionally flipping horizontally
	 * @param {HTMLVideoElement} video
	 * @param {HTMLCanvasElement} canvas
	 * @param {boolean} flipHorizontal
	 * @returns {CanvasRenderingContext2D}
	 */
	drawVideoToCanvas(video, canvas, flipHorizontal = false) {
		const ctx = canvas.getContext("2d");
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
	},

	/**
	 * Draw a rounded rectangle path (helper for overlay drawing)
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} x
	 * @param {number} y
	 * @param {number} width
	 * @param {number} height
	 * @param {number} radius
	 */
	roundedRectPath(ctx, x, y, width, height, radius) {
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
	},

	/**
	 * Draw an overlay image with rounded corners and border
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {HTMLCanvasElement|HTMLVideoElement|ImageData} image
	 * @param {number} x
	 * @param {number} y
	 * @param {number} width
	 * @param {number} height
	 * @param {number} borderRadius
	 */
	drawRoundedOverlay(ctx, image, x, y, width, height, borderRadius) {
		ctx.save();
		this.roundedRectPath(ctx, x, y, width, height, borderRadius);

		// Draw black border
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 6;
		ctx.stroke();

		// Clip and draw image
		ctx.clip();
		ctx.drawImage(image, x, y, width, height);
		ctx.restore();
	},

	/**
	 * Draw an error overlay when second camera is unavailable
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} x
	 * @param {number} y
	 * @param {number} width
	 * @param {number} borderRadius
	 */
	drawErrorOverlay(ctx, x, y, width, borderRadius) {
		const height = width * (4 / 3);

		ctx.save();
		this.roundedRectPath(ctx, x, y, width, height, borderRadius);

		ctx.fillStyle = "rgba(40, 40, 40, 0.95)";
		ctx.fill();

		ctx.strokeStyle = "#ff6b6b";
		ctx.lineWidth = 6;
		ctx.stroke();

		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "bold 40px Arial";
		ctx.fillText("⚠️", x + width / 2, y + height / 2 - 20);
		ctx.font = "14px Arial";
		ctx.fillText("Second camera", x + width / 2, y + height / 2 + 20);
		ctx.fillText("not available", x + width / 2, y + height / 2 + 38);
		ctx.restore();
	},

	/**
	 * Download a canvas as a PNG image
	 * @param {HTMLCanvasElement} canvas
	 * @returns {Promise<void>}
	 */
	downloadCanvas(canvas) {
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
	},

	/**
	 * Get a camera stream with the specified facing mode
	 * @param {"environment" | "user"} facingMode
	 * @returns {Promise<MediaStream>}
	 */
	async getCamera(facingMode) {
		const constraints = {
			video: {
				...VIDEO_CONSTRAINTS,
				facingMode:
					facingMode === "environment" ? { exact: "environment" } : "user",
			},
			audio: false,
		};
		return navigator.mediaDevices.getUserMedia(constraints);
	},

	/**
	 * Stop all tracks in a media stream
	 * @param {MediaStream | null} stream
	 */
	stopStream(stream) {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
		}
	},
};
