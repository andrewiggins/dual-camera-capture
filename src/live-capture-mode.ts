import { debugLog } from "./debug.ts";
import * as elements from "./elements.ts";
import * as CaptureUtils from "./canvas.ts";
import * as UIUtils from "./ui-utils.ts";
import type { CaptureMode } from "./app.ts";
import type { VideoStreamManager } from "./video-stream-manager.ts";

/**
 * Live Capture Mode - Simultaneous dual camera streams
 * Used on non-iOS devices that support multiple concurrent camera streams
 */
export class LiveCaptureMode implements CaptureMode {
	type: string;
	private streamManager: VideoStreamManager;

	constructor(streamManager: VideoStreamManager) {
		this.type = "LiveCaptureMode";
		this.streamManager = streamManager;
	}

	async init(): Promise<void> {
		debugLog("LiveCaptureMode.init()");

		const mainCamera = this.streamManager.getMainCamera();
		const overlayCamera = this.streamManager.getOverlayCamera();

		if (mainCamera && overlayCamera) {
			// Both cameras available - dual camera mode
			debugLog("Both cameras available - dual camera mode");
			this.streamManager.showOverlay();
			UIUtils.showStatus("Cameras ready!", 2000);
		} else if (mainCamera) {
			// Single camera mode
			debugLog("Only one camera available - single camera mode", {
				mainCamera: mainCamera.deviceId,
			});
			elements.overlayError.classList.add("show");
			UIUtils.disableSwitchButton();
			UIUtils.showStatus("Single camera mode", 2000);
		} else {
			debugLog("No cameras available", null, true);
			UIUtils.showStatus("Error: No cameras found");
		}
	}

	async capture(): Promise<void> {
		const overlayCamera = this.streamManager.getOverlayCamera();

		debugLog("LiveCaptureMode.capture()", {
			mainVideoWidth: elements.mainVideo.videoWidth,
			mainVideoHeight: elements.mainVideo.videoHeight,
			hasOverlay: !!overlayCamera,
		});

		const canvas = elements.canvas;
		CaptureUtils.drawVideoToCanvas(
			elements.mainVideo,
			canvas,
			this.streamManager.isMainFront(),
		);

		const ctx = canvas.getContext("2d")!;
		const overlayWidth = canvas.width * 0.25;
		// Overlay height matches main video's viewport aspect ratio
		const overlayHeight =
			(elements.mainVideo.clientHeight / elements.mainVideo.clientWidth) *
			overlayWidth;
		const overlayX = 20;
		const overlayY = 20;
		const borderRadius = 12;

		if (overlayCamera) {
			// Create temp canvas with flipped overlay (front camera needs flip)
			const tempCanvas = document.createElement("canvas");
			CaptureUtils.drawVideoToCanvas(
				elements.overlayVideo,
				tempCanvas,
				!this.streamManager.isMainFront(),
			);

			CaptureUtils.drawRoundedOverlay(
				ctx,
				tempCanvas,
				overlayX,
				overlayY,
				overlayWidth,
				overlayHeight,
				borderRadius,
			);
		} else {
			CaptureUtils.drawErrorOverlay(
				ctx,
				overlayX,
				overlayY,
				overlayWidth,
				overlayHeight,
				borderRadius,
			);
		}

		try {
			await CaptureUtils.downloadCanvas(canvas);
			debugLog("Photo capture complete");
			UIUtils.showStatus("Photo captured!", 2000);
		} catch (e) {
			debugLog("Failed to capture photo", e, true);
			UIUtils.showStatus("Error: Failed to capture photo");
		}
	}

	async switchCameras(): Promise<void> {
		if (!this.streamManager.getOverlayCamera()) return;
		await this.streamManager.swapCameras();
		UIUtils.showStatus("Cameras switched!", 1500);
	}

	async pause(): Promise<void> {
		debugLog("LiveCaptureMode.pause()");
		await this.streamManager.pauseAll();
	}

	async resume(): Promise<void> {
		UIUtils.showStatus("Resuming cameras...");

		try {
			await this.streamManager.resumeAll();
			debugLog("Cameras resumed successfully");
			UIUtils.showStatus("Cameras resumed!", 2000);
		} catch (e) {
			debugLog(
				"Failed to resume cameras",
				{ name: (e as Error).name, message: (e as Error).message },
				true,
			);
			UIUtils.showStatus("Error resuming cameras");
		}
	}

	cleanup(): void {
		debugLog("LiveCaptureMode.cleanup()");
		// UI-only cleanup - streams managed by VideoStreamManager
	}
}
