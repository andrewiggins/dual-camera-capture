import { debugLog } from "./debug.ts";
import * as elements from "./elements.ts";
import type { Camera } from "./camera.ts";

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

	constructor(mainCamera: Camera, extraCameras: Camera[], isIOS: boolean) {
		this.isIOS = isIOS;

		this.mainCamera = mainCamera;
		debugLog("VideoStreamManager.mainCamera", {
			deviceId: this.mainCamera.deviceId,
			facingMode: this.mainCamera.facingMode,
		});

		this.mainCamera.getStream().then((stream) => {
			elements.mainVideo.srcObject = stream;
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
					elements.overlayVideo.srcObject = stream;
				});
			}
		}

		// Update overlay dimensions when main video metadata loads
		elements.mainVideo.addEventListener("loadedmetadata", () => {
			this.updateOverlayDimensions();
		});

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
		const video = elements.mainVideo;
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
			elements.mainVideo.classList.add("front-camera");
		} else {
			elements.mainVideo.classList.remove("front-camera");
		}

		if (this.overlayCamera?.shouldFlip) {
			elements.overlayVideo.classList.add("front-camera");
		} else {
			elements.overlayVideo.classList.remove("front-camera");
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
			elements.mainVideo.srcObject = this.mainCamera
				? await this.mainCamera.getStream()
				: null;
			elements.overlayVideo.srcObject = null;
		} else {
			// Desktop: just swap srcObject references
			elements.mainVideo.srcObject = this.mainCamera
				? await this.mainCamera.getStream()
				: null;
			elements.overlayVideo.srcObject = this.overlayCamera
				? await this.overlayCamera.getStream()
				: null;
		}

		this.updateOrientation();
	}

	showOverlay(): void {
		elements.overlayVideo.style.display = "";
		this.updateOrientation();
	}

	hideOverlay(): void {
		elements.overlayVideo.style.display = "none";
	}

	async pauseAll(): Promise<void> {
		debugLog("VideoStreamManager.pauseAll()");
		this.mainCamera.stop();
		this.overlayCamera?.stop();
		elements.mainVideo.srcObject = null;
		elements.overlayVideo.srcObject = null;
	}

	async resumeAll(): Promise<void> {
		debugLog("VideoStreamManager.resumeAll()", {
			mainDeviceId: this.mainCamera.deviceId,
			overlayDeviceId: this.overlayCamera?.deviceId,
			isIOS: this.isIOS,
		});

		if (this.mainCamera) {
			elements.mainVideo.srcObject = await this.mainCamera.getStream();
		}
		if (this.overlayCamera && !this.isIOS) {
			elements.overlayVideo.srcObject = await this.overlayCamera.getStream();
		}

		this.updateOrientation();
	}

	getMainCameraVideo(): CameraVideo {
		return {
			camera: this.mainCamera,
			video: elements.mainVideo,
		};
	}

	getOverlayCameraVideo(): CameraVideo | null {
		if (!this.overlayCamera) {
			return null;
		}

		return {
			camera: this.overlayCamera,
			video: elements.overlayVideo,
		};
	}
}
