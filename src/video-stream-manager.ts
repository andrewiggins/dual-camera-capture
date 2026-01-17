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
		if (cameras.length >= 2) {
			this.setMainCamera(cameras[0]);
			this.setOverlayCamera(cameras[1]);
		} else if (cameras.length === 1) {
			this.setMainCamera(cameras[0]);
		}

		this.isIOS = isIOS;
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

	private async setMainCamera(camera: Camera): Promise<void> {
		debugLog("VideoStreamManager.setMainCamera()", {
			deviceId: camera.deviceId,
			facingMode: camera.facingMode,
		});

		if (this.isIOS && this.mainCamera && this.mainCamera !== camera) {
			this.mainCamera.stop(); // iOS: must stop before switching
		}
		this.mainCamera = camera;
		elements.mainVideo.srcObject = await camera.getStream();
	}

	private async setOverlayCamera(camera: Camera | null): Promise<void> {
		debugLog("VideoStreamManager.setOverlayCamera()", {
			deviceId: camera?.deviceId ?? null,
			facingMode: camera?.facingMode ?? null,
		});

		this.overlayCamera = camera;
		elements.overlayVideo.srcObject = camera ? await camera.getStream() : null;
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
