import { debugLog } from "./debugLog.ts";
import * as elements from "./elements.ts";
import * as CaptureUtils from "./canvas.ts";
import { showStatus } from "./showStatus.ts";
import type { CaptureMode } from "./DualCameraApp.ts";
import type { VideoStreamManager } from "./VideoStreamManager.ts";
import type { CaptureDialog } from "./CaptureDialog.ts";

/**
 * Sequential Capture Mode - One camera at a time
 * Required for iOS Safari which cannot run two camera streams simultaneously
 */
export class SequentialCaptureMode implements CaptureMode {
	type: string;
	private streamManager: VideoStreamManager;
	private captureDialog: CaptureDialog;
	private capturedOverlay: OffscreenCanvas | null = null;
	private step = 0; // 0 = not started, 1 = capturing overlay, 2 = capturing main

	constructor(streamManager: VideoStreamManager, captureDialog: CaptureDialog) {
		this.type = "SequentialCaptureMode";
		this.streamManager = streamManager;
		this.captureDialog = captureDialog;
	}

	async init(): Promise<void> {
		debugLog("SequentialCaptureMode.init()");

		// Hide overlay video
		this.streamManager.hideOverlay();

		if (this.streamManager.hasDualCameras()) {
			// Dual camera mode - show sequential UI
			elements.sequentialInstructions.classList.add("show");
			elements.sequentialOverlayPreview.classList.add("show");

			// Update button text
			elements.captureBtn.textContent = "Capture Overlay";

			// Use whatever camera is currently set as main
			this.step = 1;
			this.updateInstructions();
		} else {
			// Single camera mode - simple capture (overlay error shown by DualCameraApp)
			debugLog("Single camera mode - using simple capture");
			elements.captureBtn.textContent = "Capture Photo";
			this.step = 0;
		}
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

		if (this.step === 0) {
			// Single camera mode - reuse captureMain (no overlay, no reset)
			await this.captureMain();
		} else if (this.step === 1) {
			await this.captureOverlay();
		} else if (this.step === 2) {
			await this.captureMain();
		}
	}

	private async captureOverlay(): Promise<void> {
		debugLog("SequentialCaptureMode.captureOverlay()");

		const mainVideo = this.streamManager.getMainCameraVideo();
		this.capturedOverlay = CaptureUtils.drawVideoToCanvas(
			mainVideo.video,
			mainVideo.camera.shouldFlip,
		);

		// Show preview
		const previewCanvas = elements.sequentialOverlayCanvas;
		previewCanvas.width = this.capturedOverlay.width;
		previewCanvas.height = this.capturedOverlay.height;
		previewCanvas.getContext("2d")!.drawImage(this.capturedOverlay, 0, 0);
		elements.sequentialOverlayPlaceholder.style.display = "none";

		debugLog("Overlay captured", {
			width: this.capturedOverlay.width,
			height: this.capturedOverlay.height,
		});

		// Move to step 2 and switch to the other camera
		this.step = 2;
		await this.streamManager.swapCameras();
		this.updateInstructions();

		showStatus("Overlay captured! Now capture main photo.", 2000);
	}

	private async captureMain(): Promise<void> {
		debugLog("SequentialCaptureMode.captureMain()");

		const mainVideo = this.streamManager.getMainCameraVideo();
		const canvas = CaptureUtils.drawVideoToCanvas(
			mainVideo.video,
			mainVideo.camera.shouldFlip,
		);
		if (this.capturedOverlay) {
			CaptureUtils.drawOverlayOnMainCanvas(canvas, this.capturedOverlay);
		}

		try {
			const blob = await CaptureUtils.canvasToBlob(canvas);
			debugLog("Photo capture complete");

			this.captureDialog.show(blob, canvas.width, canvas.height);
			if (this.streamManager.hasDualCameras()) {
				await this.reset();
			}
		} catch (e) {
			debugLog("Failed to capture photo", e, true);
			showStatus("Error: Failed to capture photo");
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

	async pause(): Promise<void> {
		debugLog("SequentialCaptureMode.pause()");
		await this.streamManager.pauseAll();
	}

	async resume(): Promise<void> {
		debugLog("SequentialCaptureMode.resume()", { step: this.step });
		showStatus("Resuming camera...");

		try {
			await this.streamManager.resumeAll();
			debugLog("Camera resumed successfully");
			showStatus("Camera resumed!", 2000);
		} catch (e) {
			debugLog(
				"Failed to resume camera",
				{ name: (e as Error).name, message: (e as Error).message },
				true,
			);
			showStatus("Error resuming camera");
		}
	}

	cleanup(): void {
		debugLog("SequentialCaptureMode.cleanup()");
		this.capturedOverlay = null;
		this.step = 0;

		// Hide sequential UI
		elements.sequentialInstructions.classList.remove("show");
		elements.sequentialOverlayPreview.classList.remove("show");
		elements.sequentialOverlayPlaceholder.style.display = "flex";
	}
}
