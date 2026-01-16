import { debugLog } from "./debug.js";
import * as elements from "./elements.js";
import * as CaptureUtils from "./capture-utils.js";
import * as UIUtils from "./ui-utils.js";

/** @import {CaptureMode} from "./app.js" */

/**
 * Live Capture Mode - Simultaneous dual camera streams
 * Used on non-iOS devices that support multiple concurrent camera streams
 * @implements {CaptureMode}
 */
export class LiveCaptureMode {
	constructor() {
		this.mainStream = null;
		this.overlayStream = null;
		this.isMainFront = false;
	}

	async init() {
		debugLog("LiveCaptureMode.init()");
		UIUtils.showStatus("Initializing cameras...");

		let backStream = null;
		let frontStream = null;

		// Try to get back camera
		try {
			backStream = await CaptureUtils.getCamera("environment");
			debugLog("Back camera obtained successfully", {
				tracks: backStream.getVideoTracks().map((t) => ({
					label: t.label,
					settings: t.getSettings(),
				})),
			});
		} catch (e) {
			debugLog(
				"Back camera not available",
				{ name: e.name, message: e.message },
				true,
			);
		}

		// Try to get front camera
		try {
			frontStream = await CaptureUtils.getCamera("user");
			debugLog("Front camera obtained successfully", {
				tracks: frontStream.getVideoTracks().map((t) => ({
					label: t.label,
					settings: t.getSettings(),
				})),
			});
		} catch (e) {
			debugLog(
				"Front camera not available",
				{ name: e.name, message: e.message },
				true,
			);
		}

		debugLog("Stream results", {
			hasBack: !!backStream,
			hasFront: !!frontStream,
		});

		if (backStream && frontStream) {
			// Both cameras available - dual camera mode
			debugLog("Both cameras available - dual camera mode");
			this.mainStream = backStream;
			this.overlayStream = frontStream;
			this.isMainFront = false;
			elements.mainVideo.srcObject = this.mainStream;
			elements.overlayVideo.srcObject = this.overlayStream;
			UIUtils.updateCameraOrientation(this.isMainFront, true);
			UIUtils.showStatus("Cameras ready!", 2000);
		} else if (backStream || frontStream) {
			// Single camera mode
			debugLog("Only one camera available - single camera mode", {
				usingBack: !!backStream,
				usingFront: !!frontStream,
			});
			this.mainStream = backStream || frontStream;
			this.isMainFront = !!frontStream;
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

	async capture() {
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

		const ctx = canvas.getContext("2d");
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

	switchCameras() {
		if (!this.overlayStream) return;

		debugLog("LiveCaptureMode.switchCameras()", {
			isMainFront: this.isMainFront,
		});

		// Swap streams
		const temp = this.mainStream;
		this.mainStream = this.overlayStream;
		this.overlayStream = temp;

		elements.mainVideo.srcObject = this.mainStream;
		elements.overlayVideo.srcObject = this.overlayStream;

		this.isMainFront = !this.isMainFront;
		UIUtils.updateCameraOrientation(this.isMainFront, true);
		debugLog("Cameras switched", { isMainFront: this.isMainFront });
		UIUtils.showStatus("Cameras switched!", 1500);
	}

	cleanup() {
		debugLog("LiveCaptureMode.cleanup()");
		CaptureUtils.stopStream(this.mainStream);
		CaptureUtils.stopStream(this.overlayStream);
		this.mainStream = null;
		this.overlayStream = null;
	}
}
