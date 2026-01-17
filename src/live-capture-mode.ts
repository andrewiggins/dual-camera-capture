import { debugLog } from "./debug.ts";
import * as elements from "./elements.ts";
import * as CaptureUtils from "./capture-utils.ts";
import * as UIUtils from "./ui-utils.ts";
import type { CaptureMode } from "./types.ts";

/**
 * Live Capture Mode - Simultaneous dual camera streams
 * Used on non-iOS devices that support multiple concurrent camera streams
 */
export class LiveCaptureMode implements CaptureMode {
	private mainStream: MediaStream | null = null;
	private overlayStream: MediaStream | null = null;
	private isMainFront = false;
	private hasDualCameras = false;
	private mainDeviceId = "";
	private overlayDeviceId = "";

	async init(): Promise<void> {
		debugLog("LiveCaptureMode.init()");
		UIUtils.showStatus("Initializing cameras...");

		// Get both cameras, trying facingMode first then falling back to deviceId
		const { back, front } = await CaptureUtils.getDualCameras();

		if (back) {
			debugLog("Back camera obtained", {
				deviceId: back.deviceId,
				usedFallback: back.usedFallback,
				tracks: back.stream.getVideoTracks().map((t) => ({
					label: t.label,
					settings: t.getSettings(),
				})),
			});
		}

		if (front) {
			debugLog("Front camera obtained", {
				deviceId: front.deviceId,
				usedFallback: front.usedFallback,
				tracks: front.stream.getVideoTracks().map((t) => ({
					label: t.label,
					settings: t.getSettings(),
				})),
			});
		}

		if (back && front) {
			// Both cameras available - dual camera mode
			debugLog("Both cameras available - dual camera mode");
			this.mainStream = back.stream;
			this.overlayStream = front.stream;
			this.mainDeviceId = back.deviceId;
			this.overlayDeviceId = front.deviceId;
			this.isMainFront = false;
			this.hasDualCameras = true;
			elements.mainVideo.srcObject = this.mainStream;
			elements.overlayVideo.srcObject = this.overlayStream;
			UIUtils.updateCameraOrientation(this.isMainFront, true);
			UIUtils.showStatus("Cameras ready!", 2000);
		} else if (back || front) {
			// Single camera mode
			const result = back || front!;
			debugLog("Only one camera available - single camera mode", {
				usingBack: !!back,
				usingFront: !!front,
			});
			this.mainStream = result.stream;
			this.mainDeviceId = result.deviceId;
			this.isMainFront = !!front;
			elements.mainVideo.srcObject = this.mainStream;
			UIUtils.updateCameraOrientation(this.isMainFront, false);
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
			hasOverlay: !!this.overlayStream,
		});

		const canvas = elements.canvas;
		CaptureUtils.drawVideoToCanvas(
			elements.mainVideo,
			canvas,
			this.isMainFront,
		);

		const ctx = canvas.getContext("2d")!;
		const overlayWidth = canvas.width * 0.25;
		const overlayX = 20;
		const overlayY = 20;
		const borderRadius = 12;

		if (this.overlayStream) {
			const overlayHeight =
				(elements.overlayVideo.videoHeight / elements.overlayVideo.videoWidth) *
				overlayWidth;

			// Create temp canvas with flipped overlay (front camera needs flip)
			const tempCanvas = document.createElement("canvas");
			CaptureUtils.drawVideoToCanvas(
				elements.overlayVideo,
				tempCanvas,
				!this.isMainFront,
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

	switchCameras(): void {
		if (!this.overlayStream) return;

		debugLog("LiveCaptureMode.switchCameras()", {
			isMainFront: this.isMainFront,
		});

		// Swap streams
		const tempStream = this.mainStream;
		this.mainStream = this.overlayStream;
		this.overlayStream = tempStream;

		// Swap deviceIds
		const tempDeviceId = this.mainDeviceId;
		this.mainDeviceId = this.overlayDeviceId;
		this.overlayDeviceId = tempDeviceId;

		elements.mainVideo.srcObject = this.mainStream;
		elements.overlayVideo.srcObject = this.overlayStream;

		this.isMainFront = !this.isMainFront;
		UIUtils.updateCameraOrientation(this.isMainFront, true);
		debugLog("Cameras switched", { isMainFront: this.isMainFront });
		UIUtils.showStatus("Cameras switched!", 1500);
	}

	pause(): void {
		debugLog("LiveCaptureMode.pause()");
		CaptureUtils.stopStream(this.mainStream);
		CaptureUtils.stopStream(this.overlayStream);
		this.mainStream = null;
		this.overlayStream = null;
		elements.mainVideo.srcObject = null;
		elements.overlayVideo.srcObject = null;
	}

	async resume(): Promise<void> {
		debugLog("LiveCaptureMode.resume()", {
			isMainFront: this.isMainFront,
			hasDualCameras: this.hasDualCameras,
			mainDeviceId: this.mainDeviceId,
			overlayDeviceId: this.overlayDeviceId,
		});
		UIUtils.showStatus("Resuming cameras...");

		if (this.hasDualCameras) {
			// Restore dual camera setup using deviceIds
			try {
				this.mainStream = await CaptureUtils.getCameraByDeviceId(this.mainDeviceId);
				this.overlayStream = await CaptureUtils.getCameraByDeviceId(this.overlayDeviceId);
				elements.mainVideo.srcObject = this.mainStream;
				elements.overlayVideo.srcObject = this.overlayStream;
				UIUtils.updateCameraOrientation(this.isMainFront, true);
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
		} else {
			// Restore single camera setup
			try {
				this.mainStream = await CaptureUtils.getCameraByDeviceId(this.mainDeviceId);
				elements.mainVideo.srcObject = this.mainStream;
				UIUtils.updateCameraOrientation(this.isMainFront, false);
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
		}
	}

	cleanup(): void {
		debugLog("LiveCaptureMode.cleanup()");
		CaptureUtils.stopStream(this.mainStream);
		CaptureUtils.stopStream(this.overlayStream);
		this.mainStream = null;
		this.overlayStream = null;
	}
}
