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

		const overlayCamera = this.streamManager.getOverlayCameraVideo();

		if (overlayCamera) {
			// Both cameras available - dual camera mode
			debugLog("Both cameras available - dual camera mode");
			this.streamManager.showOverlay();
			UIUtils.showStatus("Cameras ready!", 2000);
		} else {
			// Single camera mode
			debugLog("Only one camera available - single camera mode");
			elements.overlayError.classList.add("show");
			UIUtils.disableSwitchButton();
			UIUtils.showStatus("Single camera mode", 2000);
		}
	}

	async capture(): Promise<void> {
		debugLog("LiveCaptureMode.capture()");

		const mainVideo = this.streamManager.getMainCameraVideo();
		const mainImage = CaptureUtils.drawVideoToCanvas(
			mainVideo.video,
			mainVideo.camera.shouldFlip,
		);

		const overlayVideo = this.streamManager.getOverlayCameraVideo();
		if (overlayVideo) {
			const overlayImage = CaptureUtils.drawVideoToCanvas(
				overlayVideo.video,
				overlayVideo.camera.shouldFlip,
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
