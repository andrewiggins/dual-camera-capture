import { debugLog } from "./debug.ts";
import * as elements from "./elements.ts";
import * as CaptureUtils from "./capture-utils.ts";
import * as UIUtils from "./ui-utils.ts";
import type { Camera } from "./camera.ts";
import type { CaptureMode } from "./app.ts";

/**
 * Live Capture Mode - Simultaneous dual camera streams
 * Used on non-iOS devices that support multiple concurrent camera streams
 */
export class LiveCaptureMode implements CaptureMode {
	type: string;
	private cameras: Camera[];
	private mainCamera: Camera | null = null;
	private overlayCamera: Camera | null = null;

	// private mainStream: MediaStream | null = null;
	// private overlayStream: MediaStream | null = null;
	// private isMainFront = false;
	// private hasDualCameras = false;
	// private mainDeviceId = "";
	// private overlayDeviceId = "";

	constructor(cameras: Camera[]) {
		this.type = "LiveCaptureMode";
		this.cameras = cameras;
	}

	private isMainFront() {
		return this.mainCamera?.facingMode === "user";
	}

	async init(): Promise<void> {
		debugLog("LiveCaptureMode.init()");

		if (this.cameras.length > 1) {
			// Both cameras available - dual camera mode
			debugLog("Both cameras available - dual camera mode");
			this.mainCamera = this.cameras[0];
			this.overlayCamera = this.cameras[1];

			const mainStream = await this.mainCamera.getStream();
			const overlayStream = await this.overlayCamera.getStream();
			elements.mainVideo.srcObject = mainStream;
			elements.overlayVideo.srcObject = overlayStream;

			UIUtils.updateCameraOrientation(this.isMainFront(), true);
			UIUtils.showStatus("Cameras ready!", 2000);
		} else if (this.cameras.length === 1) {
			// Single camera mode
			this.mainCamera = this.cameras[0];
			debugLog("Only one camera available - single camera mode", {
				isMainFront: this.isMainFront(),
			});
			const mainStream = await this.mainCamera.getStream();
			elements.mainVideo.srcObject = mainStream;
			elements.overlayError.classList.add("show");

			UIUtils.updateCameraOrientation(this.isMainFront(), false);
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
			hasOverlay: !!this.overlayCamera,
		});

		const canvas = elements.canvas;
		CaptureUtils.drawVideoToCanvas(
			elements.mainVideo,
			canvas,
			this.isMainFront(),
		);

		const ctx = canvas.getContext("2d")!;
		const overlayWidth = canvas.width * 0.25;
		const overlayX = 20;
		const overlayY = 20;
		const borderRadius = 12;

		if (this.overlayCamera) {
			const overlayHeight =
				(elements.overlayVideo.videoHeight / elements.overlayVideo.videoWidth) *
				overlayWidth;

			// Create temp canvas with flipped overlay (front camera needs flip)
			const tempCanvas = document.createElement("canvas");
			CaptureUtils.drawVideoToCanvas(
				elements.overlayVideo,
				tempCanvas,
				!this.isMainFront(),
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
		if (!this.overlayCamera) return;

		debugLog("LiveCaptureMode.switchCameras()", {
			isMainFront: this.isMainFront(),
		});

		// Swap streams
		const tempStream = this.mainCamera;
		this.mainCamera = this.overlayCamera;
		this.overlayCamera = tempStream;

		elements.mainVideo.srcObject = await this.mainCamera.getStream();
		elements.overlayVideo.srcObject =
			(await this.overlayCamera?.getStream()) ?? null;

		UIUtils.updateCameraOrientation(this.isMainFront(), true);
		debugLog("Cameras switched", { isMainFront: this.isMainFront() });
		UIUtils.showStatus("Cameras switched!", 1500);
	}

	async pause(): Promise<void> {
		debugLog("LiveCaptureMode.pause()");
		this.cameras.forEach((camera) => camera.stop());
		elements.mainVideo.srcObject = null;
		elements.overlayVideo.srcObject = null;
	}

	async resume(): Promise<void> {
		debugLog("LiveCaptureMode.resume()", {
			isMainFront: this.isMainFront(),
			mainDeviceId: this.mainCamera?.deviceId,
			overlayDeviceId: this.overlayCamera?.deviceId,
		});
		UIUtils.showStatus("Resuming cameras...");

		if (this.mainCamera && this.overlayCamera) {
			// Restore dual camera setup using deviceIds
			try {
				const mainStream = await this.mainCamera.getStream();
				const overlayStream = await this.overlayCamera.getStream();
				elements.mainVideo.srcObject = mainStream;
				elements.overlayVideo.srcObject = overlayStream;
				UIUtils.updateCameraOrientation(this.isMainFront(), true);
				debugLog("Dual cameras resumed successfully");
				UIUtils.showStatus("Cameras resumed!", 2000);
			} catch (e) {
				debugLog(
					"Failed to resume cameras",
					{ name: (e as Error).name, message: (e as Error).message },
					true,
				);
				UIUtils.showStatus("Error resuming cameras");
			}
		} else if (this.mainCamera) {
			// Restore single camera setup
			try {
				const mainStream = await this.mainCamera.getStream();
				elements.mainVideo.srcObject = mainStream;
				UIUtils.updateCameraOrientation(this.isMainFront(), false);
				debugLog("Single camera resumed successfully");
				UIUtils.showStatus("Camera resumed!", 2000);
			} catch (e) {
				debugLog(
					"Failed to resume camera",
					{ name: (e as Error).name, message: (e as Error).message },
					true,
				);
				UIUtils.showStatus("Error resuming camera");
			}
		} else {
			debugLog("No cameras to resume", null, true);
			UIUtils.showStatus("Error: No cameras found");
		}
	}

	async cleanup(): Promise<void> {
		debugLog("LiveCaptureMode.cleanup()");
		this.cameras.forEach((camera) => camera.stop());
	}
}
