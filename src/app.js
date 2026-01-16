import { debugLog } from "./debug.js";
import * as elements from "./elements.js";
import * as DeviceInfo from "./device-info.js";
import * as UIUtils from "./ui-utils.js";
import { LiveCaptureMode } from "./live-capture-mode.js";
import { SequentialCaptureMode } from "./sequential-capture-mode.js";

/**
 * Main application controller
 * Manages capture modes and handles user interactions
 */
export class DualCameraApp {
	constructor() {
		/** @type {LiveCaptureMode | SequentialCaptureMode | null} */
		this.currentMode = null;
		this.isSequentialMode = false;
	}

	async init() {
		debugLog("DualCameraApp.init()", { isIOS: DeviceInfo.isIOS });

		// Detect available cameras
		await DeviceInfo.detectCameras();

		// Force sequential mode on iOS with multiple cameras
		if (DeviceInfo.isIOS && DeviceInfo.hasMultipleCameras) {
			debugLog(
				"iOS detected with multiple cameras - forcing sequential capture mode",
			);
			this.isSequentialMode = true;
			this.currentMode = new SequentialCaptureMode();
		} else {
			this.currentMode = new LiveCaptureMode();

			// Show mode toggle for non-iOS with multiple cameras
			if (DeviceInfo.hasMultipleCameras) {
				elements.modeToggle.classList.add("show");
			}
		}

		await this.currentMode.init();
		this.setupEventListeners();
	}

	setupEventListeners() {
		elements.overlayVideo.addEventListener("click", () => {
			debugLog("Overlay video clicked");
			this.currentMode.switchCameras();
		});

		elements.switchBtn.addEventListener("click", () => {
			debugLog("Switch button clicked");
			this.currentMode.switchCameras();
		});

		elements.captureBtn.addEventListener("click", () => {
			debugLog("Capture button clicked");
			this.currentMode.capture();
		});

		elements.modeToggle.addEventListener("click", () => {
			debugLog("Mode toggle clicked");
			this.toggleMode();
		});
	}

	async toggleMode() {
		if (DeviceInfo.isIOS) return; // Can't toggle on iOS

		debugLog("toggleMode()", {
			currentMode: this.isSequentialMode ? "sequential" : "live",
		});

		// Cleanup current mode
		this.currentMode.cleanup();

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
