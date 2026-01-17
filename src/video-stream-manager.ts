import { debugLog } from "./debug.ts";
import * as elements from "./elements.ts";
import type { Camera } from "./camera.ts";

/**
 * Manages video element to camera stream bindings
 * Centralizes stream lifecycle to avoid unnecessary getUserMedia calls when switching modes
 */
export class VideoStreamManager {
	private mainCamera: Camera | null = null;
	private overlayCamera: Camera | null = null;
	private isIOS: boolean;
	private overlayVisible = true;

	constructor(cameras: Camera[], isIOS: boolean) {
		this.isIOS = isIOS;

		if (cameras.length > 0) {
			this.mainCamera = cameras[0];
			debugLog("VideoStreamManager.setMainCamera()", {
				deviceId: this.mainCamera.deviceId,
				facingMode: this.mainCamera.facingMode,
			});

			this.mainCamera.getStream().then((stream) => {
				elements.mainVideo.srcObject = stream;
			});
		}

		if (cameras.length > 1) {
			this.overlayCamera = cameras[1];
			debugLog("VideoStreamManager.setOverlayCamera()", {
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
	}

	private updateOrientation(): void {
		const isMainFront = this.isMainFront();

		if (isMainFront) {
			elements.mainVideo.classList.add("front-camera");
		} else {
			elements.mainVideo.classList.remove("front-camera");
		}

		if (this.overlayVisible) {
			if (isMainFront) {
				elements.overlayVideo.classList.remove("front-camera");
			} else {
				elements.overlayVideo.classList.add("front-camera");
			}
		}
	}

	async swapCameras(): Promise<void> {
		debugLog("VideoStreamManager.swapCameras()", {
			mainDeviceId: this.mainCamera?.deviceId,
			overlayDeviceId: this.overlayCamera?.deviceId,
		});

		const temp = this.mainCamera;
		this.mainCamera = this.overlayCamera;
		this.overlayCamera = temp;

		if (this.isIOS) {
			// iOS: stop old, start new (only one stream at a time)
			this.overlayCamera?.stop();
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
		this.overlayVisible = true;
		elements.overlayVideo.style.display = "";
		this.updateOrientation();
	}

	hideOverlay(): void {
		this.overlayVisible = false;
		elements.overlayVideo.style.display = "none";
	}

	async pauseAll(): Promise<void> {
		debugLog("VideoStreamManager.pauseAll()");
		this.mainCamera?.stop();
		this.overlayCamera?.stop();
		elements.mainVideo.srcObject = null;
		elements.overlayVideo.srcObject = null;
	}

	async resumeAll(): Promise<void> {
		debugLog("VideoStreamManager.resumeAll()", {
			mainDeviceId: this.mainCamera?.deviceId,
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

	getMainCamera(): Camera | null {
		return this.mainCamera;
	}

	getOverlayCamera(): Camera | null {
		return this.overlayCamera;
	}

	isMainFront(): boolean {
		return this.mainCamera?.facingMode === "user";
	}
}
