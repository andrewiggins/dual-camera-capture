import { debugLog } from "./debug.ts";
import * as elements from "./elements.ts";
import * as CaptureUtils from "./canvas.ts";
import * as UIUtils from "./ui-utils.ts";
import type { CaptureMode } from "./app.ts";
import type { VideoStreamManager } from "./video-stream-manager.ts";
import type { CaptureDialog } from "./capture-dialog.ts";

/**
 * Sequential Capture Mode - One camera at a time
 * Required for iOS Safari which cannot run two camera streams simultaneously
 */
export class SequentialCaptureMode implements CaptureMode {
	type: string;
	private streamManager: VideoStreamManager;
	private captureDialog: CaptureDialog;
	private capturedOverlay: ImageData | null = null;
	private step = 0; // 0 = not started, 1 = capturing overlay, 2 = capturing main

	constructor(streamManager: VideoStreamManager, captureDialog: CaptureDialog) {
		this.type = "SequentialCaptureMode";
		this.streamManager = streamManager;
		this.captureDialog = captureDialog;
	}

	async init(): Promise<void> {
		debugLog("SequentialCaptureMode.init()");

		// Hide overlay video, show sequential UI
		this.streamManager.hideOverlay();
		elements.sequentialInstructions.classList.add("show");
		elements.sequentialOverlayPreview.classList.add("show");

		// Update button text
		elements.captureBtn.textContent = "Capture Overlay";
		elements.switchBtn.textContent = "Switch Camera";

		// Use whatever camera is currently set as main
		this.step = 1;
		this.updateInstructions();
	}

	private updateInstructions(): void {
		if (this.step === 1) {
			elements.sequentialInstructions.textContent = `Step 1: Capture the overlay photo`;
			elements.captureBtn.textContent = "Capture Overlay";
		} else if (this.step === 2) {
			elements.sequentialInstructions.textContent = `Step 2: Capture the main photo`;
			elements.captureBtn.textContent = "Capture & Download";
		}
	}

	async capture(): Promise<void> {
		debugLog("SequentialCaptureMode.capture()", { step: this.step });

		if (this.step === 1) {
			await this.captureOverlay();
		} else if (this.step === 2) {
			await this.captureMain();
		}
	}

	private async captureOverlay(): Promise<void> {
		debugLog("SequentialCaptureMode.captureOverlay()");

		const canvas = elements.canvas;
		CaptureUtils.drawVideoToCanvas(
			elements.mainVideo,
			canvas,
			this.streamManager.isMainFront(),
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
		});

		// Move to step 2 and switch to the other camera
		this.step = 2;
		await this.streamManager.swapCameras();
		this.updateInstructions();

		UIUtils.showStatus("Overlay captured! Now capture main photo.", 2000);
	}

	private async captureMain(): Promise<void> {
		debugLog("SequentialCaptureMode.captureMain()");

		const canvas = elements.canvas;
		CaptureUtils.drawVideoToCanvas(
			elements.mainVideo,
			canvas,
			this.streamManager.isMainFront(),
		);

		if (this.capturedOverlay) {
			const ctx = canvas.getContext("2d")!;
			const overlayWidth = canvas.width * 0.25;
			// Use current viewport aspect ratio (matches CSS preview and live mode)
			const overlayHeight =
				(elements.mainVideo.clientHeight / elements.mainVideo.clientWidth) *
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
			const blob = await CaptureUtils.canvasToBlob(canvas);
			debugLog("Photo capture complete");
			this.captureDialog.show(blob);
			await this.reset();
		} catch (e) {
			debugLog("Failed to capture photo", e, true);
			UIUtils.showStatus("Error: Failed to capture photo");
		}
	}

	private async reset(): Promise<void> {
		debugLog("SequentialCaptureMode.reset()");

		this.capturedOverlay = null;
		this.step = 1;

		// Clear preview and show placeholder
		const previewCanvas = elements.sequentialOverlayCanvas;
		previewCanvas
			.getContext("2d")!
			.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
		elements.sequentialOverlayPlaceholder.style.display = "flex";

		// Swap back to the original camera
		await this.streamManager.swapCameras();
		this.updateInstructions();
	}

	async switchCameras(): Promise<void> {
		debugLog("SequentialCaptureMode.switchCameras()");
		await this.streamManager.swapCameras();
		this.updateInstructions();
		UIUtils.showStatus("Camera switched!", 1500);
	}

	async pause(): Promise<void> {
		debugLog("SequentialCaptureMode.pause()");
		await this.streamManager.pauseAll();
	}

	async resume(): Promise<void> {
		debugLog("SequentialCaptureMode.resume()", { step: this.step });
		UIUtils.showStatus("Resuming camera...");

		try {
			await this.streamManager.resumeAll();
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

	cleanup(): void {
		debugLog("SequentialCaptureMode.cleanup()");
		this.capturedOverlay = null;
		this.step = 0;

		// Hide sequential UI
		elements.sequentialInstructions.classList.remove("show");
		elements.sequentialOverlayPreview.classList.remove("show");
		this.streamManager.showOverlay();
		elements.sequentialOverlayPlaceholder.style.display = "flex";
	}
}
