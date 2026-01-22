import { debugLog } from "./debugLog.ts";
import type { Camera } from "./getCameras.ts";
import { OverlayPosition, type Corner } from "./OverlayPosition.ts";
import "./OverlayPosition.css";

const mainVideoEl = document.getElementById("mainVideo") as HTMLVideoElement;
const overlayVideoEl = document.getElementById(
	"overlayVideo",
) as HTMLVideoElement;
const overlayErrorEl = document.getElementById("overlayError") as HTMLElement;
const sequentialOverlayPreviewEl = document.getElementById(
	"sequentialOverlayPreview",
) as HTMLElement;

export interface CameraVideo {
	camera: Camera;
	video: HTMLVideoElement;
}

/**
 * Manages video element to camera stream bindings
 * Centralizes stream lifecycle to avoid unnecessary getUserMedia calls when switching modes
 */
export class VideoStreamManager {
	private mainCamera: Camera;
	private overlayCamera: Camera | null = null;
	private isIOS: boolean;
	private overlayPosition: OverlayPosition;

	constructor(mainCamera: Camera, extraCameras: Camera[], isIOS: boolean) {
		this.isIOS = isIOS;

		this.mainCamera = mainCamera;
		debugLog("VideoStreamManager.mainCamera", {
			deviceId: this.mainCamera.deviceId,
			facingMode: this.mainCamera.facingMode,
		});

		this.mainCamera.getStream().then((stream) => {
			mainVideoEl.srcObject = stream;
		});

		if (extraCameras.length > 0) {
			this.overlayCamera = extraCameras[0];
			debugLog("VideoStreamManager.overlayCamera", {
				deviceId: this.overlayCamera.deviceId,
				facingMode: this.overlayCamera.facingMode,
			});

			if (!this.isIOS) {
				// iOS can only have one active stream at a time
				this.overlayCamera.getStream().then((stream) => {
					overlayVideoEl.srcObject = stream;
				});
			}
		}

		this.updateOrientation();

		// Update overlay dimensions when main video metadata loads
		mainVideoEl.addEventListener("loadedmetadata", () => {
			this.updateOverlayDimensions();
		});

		// Show overlay video once stream is playing (prevents empty black box during load)
		overlayVideoEl.addEventListener("playing", () => {
			overlayVideoEl.classList.add("stream-ready");
		});

		// Initialize overlay position manager for drag-to-snap and tap-to-swap
		this.overlayPosition = new OverlayPosition(
			[overlayVideoEl, overlayErrorEl, sequentialOverlayPreviewEl],
			() => this.swapCameras(),
		);

		// Update overlay dimensions on resize/orientation change
		window.addEventListener("resize", () => {
			this.updateOverlayDimensions();
		});
	}

	/**
	 * Update overlay aspect ratio to match the visible viewport.
	 * Uses the main video element's rendered dimensions (what the user sees)
	 * rather than the video stream's native aspect ratio.
	 */
	private updateOverlayDimensions(): void {
		const video = mainVideoEl;
		// Use the element's rendered size (viewport), not video stream dimensions
		const width = video.clientWidth;
		const height = video.clientHeight;
		if (width === 0 || height === 0) return;

		const aspectRatio = width / height;

		// Set CSS custom property for aspect ratio on container
		const container = video.parentElement;
		if (container) {
			container.style.setProperty("--overlay-aspect-ratio", `${aspectRatio}`);
		}
	}

	private updateOrientation(): void {
		if (this.mainCamera.shouldFlip) {
			debugLog("Flipping main camera video horizontally");
			mainVideoEl.classList.add("front-camera");
		} else {
			debugLog("Setting main camera video to normal orientation");
			mainVideoEl.classList.remove("front-camera");
		}

		if (this.overlayCamera?.shouldFlip) {
			debugLog("Flipping overlay camera video horizontally");
			overlayVideoEl.classList.add("front-camera");
		} else {
			debugLog("Setting overlay camera video to normal orientation");
			overlayVideoEl.classList.remove("front-camera");
		}
	}

	async swapCameras(): Promise<void> {
		if (!this.overlayCamera) {
			debugLog("VideoStreamManager.swapCameras() - no overlay camera");
			return;
		}

		debugLog("VideoStreamManager.swapCameras()", {
			mainDeviceId: this.mainCamera.deviceId,
			overlayDeviceId: this.overlayCamera.deviceId,
		});

		const temp = this.mainCamera;
		this.mainCamera = this.overlayCamera;
		this.overlayCamera = temp;

		if (this.isIOS) {
			// iOS: stop old, start new (only one stream at a time)
			this.overlayCamera.stop();
			mainVideoEl.srcObject = this.mainCamera
				? await this.mainCamera.getStream()
				: null;
			overlayVideoEl.srcObject = null;
		} else {
			// Desktop: just swap srcObject references
			mainVideoEl.srcObject = this.mainCamera
				? await this.mainCamera.getStream()
				: null;
			overlayVideoEl.srcObject = this.overlayCamera
				? await this.overlayCamera.getStream()
				: null;
		}

		this.updateOrientation();
	}

	showOverlay(): void {
		overlayVideoEl.style.display = "";
		this.updateOrientation();
	}

	hideOverlay(): void {
		overlayVideoEl.style.display = "none";
	}

	pauseVideos(): void {
		debugLog("VideoStreamManager.pauseVideos()");
		mainVideoEl.pause();
		overlayVideoEl.pause();
	}

	playVideos(): void {
		debugLog("VideoStreamManager.playVideos()");
		mainVideoEl.play();
		overlayVideoEl.play();
	}

	async stopAllStreams(): Promise<void> {
		debugLog("VideoStreamManager.stopAllStreams()");
		this.mainCamera.stop();
		this.overlayCamera?.stop();
		mainVideoEl.srcObject = null;
		overlayVideoEl.srcObject = null;
		overlayVideoEl.classList.remove("stream-ready");
	}

	async resumeAllStreams(): Promise<void> {
		debugLog("VideoStreamManager.resumeAll()", {
			mainDeviceId: this.mainCamera.deviceId,
			overlayDeviceId: this.overlayCamera?.deviceId,
			isIOS: this.isIOS,
		});

		if (this.mainCamera) {
			mainVideoEl.srcObject = await this.mainCamera.getStream();
		}
		if (this.overlayCamera && !this.isIOS) {
			overlayVideoEl.srcObject = await this.overlayCamera.getStream();
		}

		this.updateOrientation();
	}

	getMainCameraVideo(): CameraVideo {
		return {
			camera: this.mainCamera,
			video: mainVideoEl,
		};
	}

	getOverlayCameraVideo(): CameraVideo | null {
		if (!this.overlayCamera) {
			return null;
		}

		return {
			camera: this.overlayCamera,
			video: overlayVideoEl,
		};
	}

	hasDualCameras(): boolean {
		return this.overlayCamera !== null;
	}

	getOverlayCorner(): Corner {
		return this.overlayPosition.getCorner();
	}
}
