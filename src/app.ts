import { debugLog } from "./debug.ts";
import * as elements from "./elements.ts";
import { getCameras } from "./camera.ts";
import * as UIUtils from "./ui-utils.ts";
import { LiveCaptureMode } from "./live-capture-mode.ts";
import { SequentialCaptureMode } from "./sequential-capture-mode.ts";
import { VideoStreamManager } from "./video-stream-manager.ts";

/**
 * Interface for capture mode implementations
 * Both LiveCaptureMode and SequentialCaptureMode implement this interface
 */
export interface CaptureMode {
	type: string;
	init(): Promise<void>;
	switchCameras(): Promise<void>;
	capture(): Promise<void>;
	cleanup(): void;
	pause(): Promise<void>;
	resume(): Promise<void>;
}

/**
 * Device detection singleton
 * Detects iOS devices and available cameras
 */
const isIOS =
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * Main application controller
 * Manages capture modes and handles user interactions
 */
export class DualCameraApp {
	private currentMode: CaptureMode | null = null;
	private streamManager!: VideoStreamManager;

	async init(): Promise<void> {
		debugLog("DualCameraApp.init()", { isIOS });

		// Detect available cameras
		UIUtils.showStatus("Initializing cameras...");
		const cameras = await getCameras(isIOS);
		this.streamManager = new VideoStreamManager(cameras, isIOS);

		// Force sequential mode on iOS with multiple cameras
		if (isIOS && cameras.length >= 2) {
			debugLog(
				"iOS detected with multiple cameras - forcing sequential capture mode",
			);
			this.currentMode = new SequentialCaptureMode(
				this.streamManager,
				elements.captureDialog,
			);
		} else {
			this.currentMode = new LiveCaptureMode(
				this.streamManager,
				elements.captureDialog,
			);

			// Show mode toggle for non-iOS with multiple cameras
			if (!isIOS && cameras.length >= 2) {
				elements.modeToggle.classList.add("show");
			}
		}

		await this.currentMode.init();
		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		elements.overlayVideo.addEventListener("click", async () => {
			debugLog("Overlay video clicked");
			await this.currentMode?.switchCameras();
		});

		elements.switchBtn.addEventListener("click", async () => {
			debugLog("Switch button clicked");
			await this.currentMode?.switchCameras();
		});

		elements.captureBtn.addEventListener("click", async () => {
			debugLog("Capture button clicked");
			await this.currentMode?.capture();
		});

		elements.modeToggle.addEventListener("click", async () => {
			debugLog("Mode toggle clicked");
			await this.toggleMode();
		});

		document.addEventListener("visibilitychange", async () => {
			await this.handleVisibilityChange();
		});
	}

	private async handleVisibilityChange(): Promise<void> {
		debugLog("Visibility changed", { hidden: document.hidden });

		if (document.hidden) {
			await this.currentMode?.pause();
		} else {
			await this.currentMode?.resume();
		}
	}

	private async toggleMode(): Promise<void> {
		if (isIOS) return; // Can't toggle on iOS

		debugLog("toggleMode()", {
			currentMode: this.currentMode?.type,
		});

		// Cleanup current mode (UI-only, no stream work)
		this.currentMode?.cleanup();

		let isSequentialMode = this.currentMode?.type === "SequentialCaptureMode";
		if (isSequentialMode) {
			// Switch to live mode
			this.currentMode = new LiveCaptureMode(
				this.streamManager,
				elements.captureDialog,
			);
			elements.modeToggle.textContent = "Sequential Mode";
			elements.captureBtn.textContent = "Capture Photo";
			elements.switchBtn.textContent = "Switch Cameras";
			UIUtils.showStatus("Switching to live mode...");
		} else {
			// Switch to sequential mode
			this.currentMode = new SequentialCaptureMode(
				this.streamManager,
				elements.captureDialog,
			);
			elements.modeToggle.textContent = "Live Mode";
			UIUtils.showStatus("Sequential capture mode", 2000);
		}

		await this.currentMode.init();
	}
}
