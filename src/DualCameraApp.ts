import { debugLog } from "./debugLog.ts";
import * as elements from "./elements.ts";
import { getCameras } from "./getCameras.ts";
import { LiveCaptureMode } from "./LiveCaptureMode.ts";
import { SequentialCaptureMode } from "./SequentialCaptureMode.ts";
import { VideoStreamManager } from "./VideoStreamManager.ts";
import { showStatus } from "./showStatus.ts";

const modeToggle = document.getElementById("modeToggle") as HTMLButtonElement;
const modeToggleIcon = document.getElementById(
	"modeToggleIcon",
) as unknown as SVGUseElement;
const switchBtn = document.getElementById("switchBtn") as HTMLButtonElement;
const overlayError = document.getElementById("overlayError") as HTMLDivElement;

/**
 * Interface for capture mode implementations
 * Both LiveCaptureMode and SequentialCaptureMode implement this interface
 */
export interface CaptureMode {
	type: string;
	init(): Promise<void>;
	capture(): Promise<void>;
	cleanup(): void;
	stop(): Promise<void>;
	resume(): Promise<void>;
}

/**
 * Device detection singleton
 * Detects iOS devices and available cameras
 *
 * iOS can't render more than one camera stream simultaneously due to WebKit limitations
 * https://bugs.webkit.org/show_bug.cgi?id=179363
 * https://bugs.webkit.org/show_bug.cgi?id=238492
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
		showStatus("Initializing cameras...", 2000);
		const cameras = await getCameras(isIOS);
		if (cameras.length === 0) {
			debugLog("No cameras found", null, true);
			showStatus("Error: No cameras found");
			return;
		}

		debugLog(`Detected ${cameras.length} camera(s)`, {
			cameras: cameras.map((c) => ({
				deviceId: c.deviceId,
				facingMode: c.facingMode,
			})),
		});

		this.streamManager = new VideoStreamManager(
			cameras[0],
			cameras.slice(1),
			isIOS,
		);

		// Force sequential mode on iOS with multiple cameras
		if (isIOS && this.streamManager.hasDualCameras()) {
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
			if (!isIOS && this.streamManager.hasDualCameras()) {
				modeToggle.classList.add("show");
			}
		}

		await this.currentMode.init();

		// Handle single camera mode (shared logic)
		if (!this.streamManager.hasDualCameras()) {
			this.handleSingleCameraMode();
		}

		this.setupEventListeners();
	}

	/**
	 * Handle single camera mode - shared logic for both capture modes
	 * Disables switch functionality, shows error overlay, and shows status message
	 */
	private handleSingleCameraMode(): void {
		debugLog("Entering single camera mode");
		switchBtn.disabled = true;
		switchBtn.style.opacity = "0.5";
		switchBtn.style.cursor = "not-allowed";
		overlayError.classList.add("show");
	}

	private setupEventListeners(): void {
		switchBtn.addEventListener("click", async () => {
			debugLog("Switch button clicked");
			await this.streamManager.swapCameras();
		});

		elements.captureBtn.addEventListener("click", async () => {
			debugLog("Capture button clicked");
			await this.currentMode?.capture();
		});

		modeToggle.addEventListener("click", async () => {
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
			await this.currentMode?.stop();
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
			// Update icon to show "sequential" (what clicking will switch TO)
			modeToggleIcon.setAttribute("href", "#icon-sequential");
			modeToggle.setAttribute("aria-label", "Sequential Mode");
			showStatus("Dual camera capture mode", 2000);
		} else {
			// Switch to sequential mode
			this.currentMode = new SequentialCaptureMode(
				this.streamManager,
				elements.captureDialog,
			);
			// Update icon to show "live" (what clicking will switch TO)
			modeToggleIcon.setAttribute("href", "#icon-live");
			modeToggle.setAttribute("aria-label", "Live Mode");
			showStatus("Sequential capture mode", 2000);
		}

		await this.currentMode.init();
	}
}
