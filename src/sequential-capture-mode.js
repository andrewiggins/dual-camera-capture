import { debugLog } from "./debug.js";
import { elements } from "./elements.js";
import { CaptureUtils } from "./capture-utils.js";
import { UIUtils } from "./ui-utils.js";

/**
 * Sequential Capture Mode - One camera at a time
 * Required for iOS Safari which cannot run two camera streams simultaneously
 */
export class SequentialCaptureMode {
	constructor() {
		this.mainStream = null;
		this.isMainFront = false;
		this.capturedOverlay = null;
		this.overlayWasFront = false;
		this.step = 0; // 0 = not started, 1 = capturing overlay, 2 = capturing main
	}

	async init() {
		debugLog("SequentialCaptureMode.init()");

		// Hide overlay video, show sequential UI
		elements.overlayVideo.style.display = "none";
		elements.sequentialInstructions.classList.add("show");
		elements.sequentialOverlayPreview.classList.add("show");

		// Update button text
		elements.captureBtn.textContent = "Capture Overlay";
		elements.switchBtn.textContent = "Switch Camera";

		// Start with back camera for overlay capture
		this.step = 1;
		this.isMainFront = false;
		await this.switchToCamera("environment");
		this.updateInstructions();
	}

	async switchToCamera(facingMode) {
		debugLog("SequentialCaptureMode.switchToCamera()", { facingMode });

		CaptureUtils.stopStream(this.mainStream);

		try {
			this.mainStream = await CaptureUtils.getCamera(facingMode);
			elements.mainVideo.srcObject = this.mainStream;
			this.isMainFront = facingMode === "user";
			this.updateOrientation();

			debugLog("Camera switched successfully", {
				facingMode,
				isMainFront: this.isMainFront,
				tracks: this.mainStream.getVideoTracks().map((t) => ({
					label: t.label,
					settings: t.getSettings(),
				})),
			});
		} catch (e) {
			debugLog(
				"Failed to switch camera",
				{ name: e.name, message: e.message },
				true
			);
			UIUtils.showStatus("Error switching camera: " + e.message);
		}
	}

	updateOrientation() {
		if (this.isMainFront) {
			elements.mainVideo.classList.add("front-camera");
		} else {
			elements.mainVideo.classList.remove("front-camera");
		}
	}

	updateInstructions() {
		const camera = this.isMainFront ? "front" : "back";
		if (this.step === 1) {
			elements.sequentialInstructions.textContent = `Step 1: Capture the overlay photo (${camera} camera)`;
			elements.captureBtn.textContent = "Capture Overlay";
		} else if (this.step === 2) {
			elements.sequentialInstructions.textContent = `Step 2: Capture the main photo (${camera} camera)`;
			elements.captureBtn.textContent = "Capture & Download";
		}
	}

	capture() {
		debugLog("SequentialCaptureMode.capture()", { step: this.step });

		if (this.step === 1) {
			this.captureOverlay();
		} else if (this.step === 2) {
			this.captureMain();
		}
	}

	captureOverlay() {
		debugLog("SequentialCaptureMode.captureOverlay()");

		const canvas = elements.canvas;
		CaptureUtils.drawVideoToCanvas(
			elements.mainVideo,
			canvas,
			this.isMainFront
		);

		// Store captured image
		const ctx = canvas.getContext("2d");
		this.capturedOverlay = ctx.getImageData(0, 0, canvas.width, canvas.height);
		this.overlayWasFront = this.isMainFront;

		// Show preview
		const previewCanvas = elements.sequentialOverlayCanvas;
		previewCanvas.width = canvas.width;
		previewCanvas.height = canvas.height;
		previewCanvas.getContext("2d").putImageData(this.capturedOverlay, 0, 0);
		elements.sequentialOverlayPlaceholder.style.display = "none";

		debugLog("Overlay captured", {
			width: this.capturedOverlay.width,
			height: this.capturedOverlay.height,
			wasFront: this.overlayWasFront,
		});

		// Move to step 2 and switch to opposite camera
		this.step = 2;
		const nextFacing = this.isMainFront ? "environment" : "user";
		this.switchToCamera(nextFacing);
		this.updateInstructions();

		UIUtils.showStatus("Overlay captured! Now capture main photo.", 2000);
	}

	captureMain() {
		debugLog("SequentialCaptureMode.captureMain()");

		const canvas = elements.canvas;
		CaptureUtils.drawVideoToCanvas(
			elements.mainVideo,
			canvas,
			this.isMainFront
		);

		if (this.capturedOverlay) {
			const ctx = canvas.getContext("2d");
			const overlayWidth = canvas.width * 0.25;
			const overlayHeight =
				(this.capturedOverlay.height / this.capturedOverlay.width) *
				overlayWidth;

			// Create temp canvas for overlay
			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = this.capturedOverlay.width;
			tempCanvas.height = this.capturedOverlay.height;
			tempCanvas.getContext("2d").putImageData(this.capturedOverlay, 0, 0);

			CaptureUtils.drawRoundedOverlay(
				ctx,
				tempCanvas,
				20,
				20,
				overlayWidth,
				overlayHeight,
				12
			);
		}

		CaptureUtils.downloadCanvas(canvas)
			.then(() => {
				debugLog("Photo capture complete");
				UIUtils.showStatus("Photo captured!", 2000);
				this.reset();
			})
			.catch((e) => {
				debugLog("Failed to capture photo", e, true);
				UIUtils.showStatus("Error: Failed to capture photo");
			});
	}

	reset() {
		debugLog("SequentialCaptureMode.reset()");

		this.capturedOverlay = null;
		this.step = 1;

		// Clear preview and show placeholder
		const previewCanvas = elements.sequentialOverlayCanvas;
		previewCanvas
			.getContext("2d")
			.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
		elements.sequentialOverlayPlaceholder.style.display = "flex";

		// Switch back to back camera
		this.switchToCamera("environment");
		this.updateInstructions();
	}

	switchCameras() {
		debugLog("SequentialCaptureMode.switchCameras()");
		const nextFacing = this.isMainFront ? "environment" : "user";
		this.switchToCamera(nextFacing);
		this.updateInstructions();
		UIUtils.showStatus("Camera switched!", 1500);
	}

	cleanup() {
		debugLog("SequentialCaptureMode.cleanup()");
		CaptureUtils.stopStream(this.mainStream);
		this.mainStream = null;
		this.capturedOverlay = null;
		this.step = 0;

		// Hide sequential UI
		elements.sequentialInstructions.classList.remove("show");
		elements.sequentialOverlayPreview.classList.remove("show");
		elements.overlayVideo.style.display = "";
		elements.sequentialOverlayPlaceholder.style.display = "flex";
	}
}
