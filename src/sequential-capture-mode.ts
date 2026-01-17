import { debugLog } from "./debug.ts";
import * as elements from "./elements.ts";
import * as CaptureUtils from "./capture-utils.ts";
import * as UIUtils from "./ui-utils.ts";
import type { Camera, FacingMode } from "./camera.ts";
import type { CaptureMode } from "./app.ts";

/**
 * Sequential Capture Mode - One camera at a time
 * Required for iOS Safari which cannot run two camera streams simultaneously
 */
export class SequentialCaptureMode implements CaptureMode {
	type: string;
	private cameras: Camera[];
	private mainCamera: Camera | null = null;
	private capturedOverlay: ImageData | null = null;
	private step = 0; // 0 = not started, 1 = capturing overlay, 2 = capturing main

	constructor(cameras: Camera[]) {
		this.type = "SequentialCaptureMode";
		this.cameras = cameras;
	}

	private isMainFront() {
		return this.mainCamera?.facingMode === "user";
	}

	async init(): Promise<void> {
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
		await this.switchToCamera("environment");
		this.updateInstructions();
	}

	private async switchToCamera(facingMode: FacingMode): Promise<void> {
		debugLog("SequentialCaptureMode.switchToCamera()", { facingMode });

		this.mainCamera?.stop();

		const result: Camera | null =
			this.cameras.find((c) => c.facingMode === facingMode) ??
			this.cameras.find((c) => c.deviceId !== this.mainCamera?.deviceId) ??
			null;

		if (result) {
			this.mainCamera = result;
			const mainStream = await this.mainCamera.getStream();
			elements.mainVideo.srcObject = mainStream;
			this.updateOrientation();

			debugLog("Camera switched successfully", {
				facingMode,
				deviceId: result.deviceId,
				isMainFront: this.isMainFront(),
				tracks: mainStream.getVideoTracks().map((t) => ({
					label: t.label,
					settings: t.getSettings(),
				})),
			});
		} else {
			debugLog("Failed to switch camera - no camera available", null, true);
			UIUtils.showStatus("Error: No camera available");
		}
	}

	private updateOrientation(): void {
		if (this.isMainFront()) {
			elements.mainVideo.classList.add("front-camera");
		} else {
			elements.mainVideo.classList.remove("front-camera");
		}
	}

	private updateInstructions(): void {
		const camera = this.isMainFront() ? "front" : "back";
		if (this.step === 1) {
			elements.sequentialInstructions.textContent = `Step 1: Capture the overlay photo (${camera} camera)`;
			elements.captureBtn.textContent = "Capture Overlay";
		} else if (this.step === 2) {
			elements.sequentialInstructions.textContent = `Step 2: Capture the main photo (${camera} camera)`;
			elements.captureBtn.textContent = "Capture & Download";
		}
	}

	async capture(): Promise<void> {
		debugLog("SequentialCaptureMode.capture()", { step: this.step });

		if (this.step === 1) {
			this.captureOverlay();
		} else if (this.step === 2) {
			await this.captureMain();
		}
	}

	private captureOverlay(): void {
		debugLog("SequentialCaptureMode.captureOverlay()");

		const canvas = elements.canvas;
		CaptureUtils.drawVideoToCanvas(
			elements.mainVideo,
			canvas,
			this.isMainFront(),
		);

		// Store captured image
		const ctx = canvas.getContext("2d")!;
		this.capturedOverlay = ctx.getImageData(0, 0, canvas.width, canvas.height);

		// Show preview
		const previewCanvas = elements.sequentialOverlayCanvas;
		previewCanvas.width = canvas.width;
		previewCanvas.height = canvas.height;
		previewCanvas.getContext("2d")!.putImageData(this.capturedOverlay, 0, 0);
		elements.sequentialOverlayPlaceholder.style.display = "none";

		debugLog("Overlay captured", {
			width: this.capturedOverlay.width,
			height: this.capturedOverlay.height,
			wasFront: this.isMainFront(),
		});

		// Move to step 2 and switch to opposite camera
		this.step = 2;
		const nextFacing: FacingMode = this.isMainFront() ? "environment" : "user";
		this.switchToCamera(nextFacing);
		this.updateInstructions();

		UIUtils.showStatus("Overlay captured! Now capture main photo.", 2000);
	}

	private async captureMain(): Promise<void> {
		debugLog("SequentialCaptureMode.captureMain()");

		const canvas = elements.canvas;
		CaptureUtils.drawVideoToCanvas(
			elements.mainVideo,
			canvas,
			this.isMainFront(),
		);

		if (this.capturedOverlay) {
			const ctx = canvas.getContext("2d")!;
			const overlayWidth = canvas.width * 0.25;
			const overlayHeight =
				(this.capturedOverlay.height / this.capturedOverlay.width) *
				overlayWidth;

			// Create temp canvas for overlay
			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = this.capturedOverlay.width;
			tempCanvas.height = this.capturedOverlay.height;
			tempCanvas.getContext("2d")!.putImageData(this.capturedOverlay, 0, 0);

			CaptureUtils.drawRoundedOverlay(
				ctx,
				tempCanvas,
				20,
				20,
				overlayWidth,
				overlayHeight,
				12,
			);
		}

		try {
			await CaptureUtils.downloadCanvas(canvas);
			debugLog("Photo capture complete");
			UIUtils.showStatus("Photo captured!", 2000);
			this.reset();
		} catch (e) {
			debugLog("Failed to capture photo", e, true);
			UIUtils.showStatus("Error: Failed to capture photo");
		}
	}

	private reset(): void {
		debugLog("SequentialCaptureMode.reset()");

		this.capturedOverlay = null;
		this.step = 1;

		// Clear preview and show placeholder
		const previewCanvas = elements.sequentialOverlayCanvas;
		previewCanvas
			.getContext("2d")!
			.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
		elements.sequentialOverlayPlaceholder.style.display = "flex";

		// Switch back to back camera
		this.switchToCamera("environment");
		this.updateInstructions();
	}

	async switchCameras(): Promise<void> {
		debugLog("SequentialCaptureMode.switchCameras()");
		const nextFacing: FacingMode = this.isMainFront() ? "environment" : "user";
		this.switchToCamera(nextFacing);
		this.updateInstructions();
		UIUtils.showStatus("Camera switched!", 1500);
	}

	async pause(): Promise<void> {
		debugLog("SequentialCaptureMode.pause()");
		this.cameras.forEach((c) => c.stop());
		elements.mainVideo.srcObject = null;
	}

	async resume(): Promise<void> {
		debugLog("SequentialCaptureMode.resume()", {
			isMainFront: this.isMainFront(),
			step: this.step,
			currentDeviceId: this.mainCamera?.deviceId,
		});
		UIUtils.showStatus("Resuming camera...");

		try {
			const mainStream = await this.mainCamera!.getStream();
			elements.mainVideo.srcObject = mainStream;
			this.updateOrientation();
			debugLog("Camera resumed successfully");
			UIUtils.showStatus("Camera resumed!", 2000);
		} catch (e) {
			debugLog(
				"Failed to resume camera",
				{ name: (e as Error).name, message: (e as Error).message },
				true,
			);
			UIUtils.showStatus("Error resuming camera");
		}
	}

	async cleanup(): Promise<void> {
		debugLog("SequentialCaptureMode.cleanup()");
		this.cameras.forEach((c) => c.stop());
		this.capturedOverlay = null;
		this.step = 0;

		// Hide sequential UI
		elements.sequentialInstructions.classList.remove("show");
		elements.sequentialOverlayPreview.classList.remove("show");
		elements.overlayVideo.style.display = "";
		elements.sequentialOverlayPlaceholder.style.display = "flex";
	}
}
