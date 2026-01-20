import { debugLog } from "./debugLog.ts";
import { drawVideoToCanvas, drawOverlayOnMainCanvas } from "./canvas.ts";
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

	private async doCapture(): Promise<void> {
		debugLog("LiveCaptureMode.capture()");

		performance.mark("capture-start");
		performance.mark("draw-start");
		const mainVideo = this.streamManager.getMainCameraVideo();
		const mainImage = drawVideoToCanvas(
			mainVideo.video,
			mainVideo.camera.shouldFlip,
		);

		const overlayVideo = this.streamManager.getOverlayCameraVideo();
		if (overlayVideo) {
			const overlayImage = drawVideoToCanvas(
				overlayVideo.video,
				overlayVideo.camera.shouldFlip,
			);
			drawOverlayOnMainCanvas(
				mainImage,
				overlayImage,
				mainVideo.video.clientWidth,
			);
		}

		const drawTime = performance.measure("draw-duration", "draw-start");
		debugLog("Video frames drawn to canvas", {
			duration: drawTime.duration.toFixed(2),
		});

		// Play animation with OffscreenCanvas directly (no blob conversion needed)
		await this.animation.play(mainImage, "dialog-image", () => {
			this.captureDialog.show(mainImage);
		});
	}

	async capture(): Promise<void> {
		try {
			this.streamManager.pauseVideos();
			await this.doCapture();
		} finally {
			this.streamManager.playVideos();
		}
	}

	async stop(): Promise<void> {
		debugLog("LiveCaptureMode.pause()");
		await this.streamManager.stopAllStreams();
	}

	async resume(): Promise<void> {
		showStatus("Resuming cameras...");
		try {
			await this.streamManager.resumeAllStreams();
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
