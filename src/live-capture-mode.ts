import { debugLog } from "./debug.ts";
import * as elements from "./elements.ts";
import * as CaptureUtils from "./canvas.ts";
import * as UIUtils from "./ui-utils.ts";
import type { CaptureMode } from "./app.ts";
import type { VideoStreamManager } from "./video-stream-manager.ts";
import type { CaptureDialog } from "./capture-dialog.ts";

/**
 * Live Capture Mode - Simultaneous dual camera streams
 * Used on non-iOS devices that support multiple concurrent camera streams
 */
export class LiveCaptureMode implements CaptureMode {
	type: string;
	private streamManager: VideoStreamManager;
	private captureDialog: CaptureDialog;

	constructor(streamManager: VideoStreamManager, captureDialog: CaptureDialog) {
		this.type = "LiveCaptureMode";
		this.streamManager = streamManager;
		this.captureDialog = captureDialog;
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
		debugLog("LiveCaptureMode.capture()", {
			mainVideoWidth: elements.mainVideo.videoWidth,
			mainVideoHeight: elements.mainVideo.videoHeight,
			hasOverlay: !!this.streamManager.getOverlayCamera(),
		});

		const mainImage = CaptureUtils.drawVideoToCanvas(
			elements.mainVideo,
			this.streamManager.isMainFront(),
		);

		if (this.streamManager.getOverlayCamera()) {
			const overlayImage = CaptureUtils.drawVideoToCanvas(
				elements.overlayVideo,
				!this.streamManager.isMainFront(),
			);
			CaptureUtils.drawOverlayOnMainCanvas(mainImage, overlayImage);
		}

		try {
			const blob = await CaptureUtils.canvasToBlob(mainImage);
			debugLog("Photo capture complete");

			this.captureDialog.show(blob);
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
		// UI-only cleanup - streams managed by VideoStreamManager
	}
}
