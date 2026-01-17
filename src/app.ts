import { debugLog } from "./debug.ts";
import * as elements from "./elements.ts";
import * as DeviceInfo from "./device-info.ts";
import * as UIUtils from "./ui-utils.ts";
import { LiveCaptureMode } from "./live-capture-mode.ts";
import { SequentialCaptureMode } from "./sequential-capture-mode.ts";
import type { CaptureMode } from "./types.ts";

/**
 * Main application controller
 * Manages capture modes and handles user interactions
 */
export class DualCameraApp {
	private currentMode: CaptureMode | null = null;
	private isSequentialMode = false;

	async init(): Promise<void> {
		debugLog("DualCameraApp.init()", { isIOS: DeviceInfo.isIOS });

		// Detect available cameras
		const cameras = await DeviceInfo.detectCameras();

		// Force sequential mode on iOS with multiple cameras
		if (DeviceInfo.isIOS && cameras.length >= 2) {
			debugLog(
				"iOS detected with multiple cameras - forcing sequential capture mode",
			);
			this.isSequentialMode = true;
			this.currentMode = new SequentialCaptureMode();
		} else {
			this.currentMode = new LiveCaptureMode();

			// Show mode toggle for non-iOS with multiple cameras
			if (cameras.length >= 2) {
				elements.modeToggle.classList.add("show");
			}
		}

		await this.currentMode.init();
		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		elements.overlayVideo.addEventListener("click", () => {
			debugLog("Overlay video clicked");
			this.currentMode?.switchCameras();
		});

		elements.switchBtn.addEventListener("click", () => {
			debugLog("Switch button clicked");
			this.currentMode?.switchCameras();
		});

		elements.captureBtn.addEventListener("click", () => {
			debugLog("Capture button clicked");
			this.currentMode?.capture();
		});

		elements.modeToggle.addEventListener("click", () => {
			debugLog("Mode toggle clicked");
			this.toggleMode();
		});

		document.addEventListener("visibilitychange", () => {
			this.handleVisibilityChange();
		});
	}

	private handleVisibilityChange(): void {
		debugLog("Visibility changed", { hidden: document.hidden });

		if (document.hidden) {
			this.currentMode?.pause();
		} else {
			this.currentMode?.resume();
		}
	}

	private async toggleMode(): Promise<void> {
		if (DeviceInfo.isIOS) return; // Can't toggle on iOS

		debugLog("toggleMode()", {
			currentMode: this.isSequentialMode ? "sequential" : "live",
		});

		// Cleanup current mode
		this.currentMode?.cleanup();

		if (this.isSequentialMode) {
			// Switch to live mode
			this.isSequentialMode = false;
			this.currentMode = new LiveCaptureMode();
			elements.modeToggle.textContent = "Sequential Mode";
			elements.captureBtn.textContent = "Capture Photo";
			elements.switchBtn.textContent = "Switch Cameras";
			UIUtils.showStatus("Switching to live mode...");
		} else {
			// Switch to sequential mode
			this.isSequentialMode = true;
			this.currentMode = new SequentialCaptureMode();
			elements.modeToggle.textContent = "Live Mode";
			UIUtils.showStatus("Sequential capture mode", 2000);
		}

		await this.currentMode.init();
	}
}
