import { debugLog } from "./debugLog.ts";
import * as CaptureUtils from "./canvas.ts";
import type { CaptureMode } from "./DualCameraApp.ts";
import type { VideoStreamManager } from "./VideoStreamManager.ts";
import type { CaptureDialog } from "./CaptureDialog.ts";
import { showStatus } from "./showStatus.ts";
import { CaptureAnimation } from "./CaptureAnimation.ts";

/**
 * Live Capture Mode - Simultaneous dual camera streams
 * Used on non-iOS devices that support multiple concurrent camera streams
 */
export class LiveCaptureMode implements CaptureMode {
	type: string;
	private streamManager: VideoStreamManager;
	private captureDialog: CaptureDialog;
	private animation: CaptureAnimation;

	constructor(streamManager: VideoStreamManager, captureDialog: CaptureDialog) {
		this.type = "LiveCaptureMode";
		this.streamManager = streamManager;
		this.captureDialog = captureDialog;
		this.animation = new CaptureAnimation();
	}

	async init(): Promise<void> {
		debugLog("LiveCaptureMode.init()");

		if (this.streamManager.hasDualCameras()) {
			this.streamManager.showOverlay();
			showStatus("Cameras ready!", 2000);
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
			CaptureUtils.drawOverlayOnMainCanvas(mainImage, overlayImage, mainVideo.video.clientWidth);
		}

		try {
			const blob = await CaptureUtils.canvasToBlob(mainImage);
			debugLog("Photo capture complete");

			// Create blob URL for animation
			const animationUrl = URL.createObjectURL(blob);

			// Play animation, then show dialog
			await this.animation.play(animationUrl, "dialog-image", () => {
				this.captureDialog.show(blob, mainImage.width, mainImage.height);
			});
			URL.revokeObjectURL(animationUrl);
		} catch (e) {
			debugLog("Failed to capture photo", e, true);
			showStatus("Error: Failed to capture photo");
		}
	}

	async pause(): Promise<void> {
		debugLog("LiveCaptureMode.pause()");
		await this.streamManager.pauseAll();
	}

	async resume(): Promise<void> {
		showStatus("Resuming cameras...");
		try {
			await this.streamManager.resumeAll();
			debugLog("Cameras resumed successfully");
			showStatus("Cameras resumed!", 2000);
		} catch (e) {
			debugLog(
				"Failed to resume cameras",
				{ name: (e as Error).name, message: (e as Error).message },
				true,
			);
			showStatus("Error resuming cameras");
		}
	}

	cleanup(): void {
		// No UI cleanup needed - overlay error managed by DualCameraApp
	}
}
