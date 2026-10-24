import { debugLog } from "./debugLog.ts";
import { settings, type AspectRatio } from "./settings.ts";

/** Camera facing mode type */
export type FacingMode = "environment" | "user";

export class Camera {
	deviceId: string;
	facingMode?: FacingMode;
	#stream: MediaStream | null;

	constructor(stream: MediaStream, facingMode?: FacingMode) {
		this.#stream = stream;
		const deviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
		if (!deviceId) {
			throw new Error("Camera stream has no deviceId");
		}

		this.deviceId = deviceId;
		this.facingMode = facingMode;
	}

	get shouldFlip(): boolean {
		return this.facingMode === "user";
	}

	async getStream(): Promise<MediaStream> {
		if (this.#stream) {
			return this.#stream;
		}

		this.#stream = await getVideoStream({ deviceId: this.deviceId });
		return this.#stream;
	}

	/** Re-apply resolution constraints for the current aspect ratio setting */
	async applyAspectRatio(): Promise<void> {
		const track = this.#stream?.getVideoTracks()[0];
		if (!track) return;
		await track.applyConstraints(
			getResolutionConstraints(settings.aspectRatio),
		);
	}

	stop(): void {
		if (this.#stream) {
			this.#stream.getTracks().forEach((track) => track.stop());
			this.#stream = null;
		}
	}
}

/**
 * Video constraints for high resolution capture. Fixed aspect ratios ask the
 * camera for a matching stream so the on-screen crop loses as little of the
 * sensor as possible (e.g. 4:3 uses the full sensor on most phones).
 */
function getResolutionConstraints(
	aspectRatio: AspectRatio,
): MediaTrackConstraints {
	switch (aspectRatio) {
		case "16:9":
			return {
				width: { ideal: 3840 },
				height: { ideal: 2160 },
				aspectRatio: { ideal: 16 / 9 },
			};
		case "4:3":
			return {
				width: { ideal: 4032 },
				height: { ideal: 3024 },
				aspectRatio: { ideal: 4 / 3 },
			};
		case "screen":
			return {
				width: { ideal: 4096 },
				height: { ideal: 2160 },
			};
	}
}

/**
 * Detect available video input devices
 */
async function getAllVideoDevices(): Promise<MediaDeviceInfo[]> {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const videoDevices = devices.filter((d) => d.kind === "videoinput");
		debugLog(`Found ${videoDevices.length} video input device(s):`);
		videoDevices.forEach((d, i) => {
			debugLog(
				`  Device ${i}: ${d.label || "(no label)"} [${d.deviceId.slice(0, 8)}...]`,
			);
		});
		return videoDevices;
	} catch (e) {
		debugLog("Failed to enumerate devices", e, true);
		return [];
	}
}

async function getVideoStream({
	deviceId,
	facingMode,
}: {
	deviceId?: string;
	facingMode?: FacingMode;
}): Promise<MediaStream> {
	return navigator.mediaDevices.getUserMedia({
		video: {
			...getResolutionConstraints(settings.aspectRatio),
			deviceId: deviceId ? { exact: deviceId } : undefined,
			facingMode:
				facingMode === "environment" ? { exact: "environment" } : "user",
		},
		audio: false,
	});
}

export async function getCameras(isIOS: boolean): Promise<Camera[]> {
	const cameras = [];

	// Step 1: Try to get both cameras by facingMode first
	let envCamera: Camera | null = null;
	try {
		const result = await getVideoStream({ facingMode: "environment" });
		envCamera = new Camera(result, "environment");
		debugLog("Got environment camera with facingMode environment");
	} catch (e) {
		debugLog("Environment camera facingMode failed", {
			name: (e as Error).name,
			message: (e as Error).message,
		});
	}

	if (envCamera) {
		// Stop camera so on iOS only one is active at a time
		if (isIOS) envCamera.stop();
		cameras.push(envCamera);
	}

	let userCamera: Camera | null = null;
	try {
		const result = await getVideoStream({ facingMode: "user" });
		userCamera = new Camera(result, "user");
		debugLog("Got front camera with facingMode user");
	} catch (e) {
		debugLog("Front camera facingMode failed", {
			name: (e as Error).name,
			message: (e as Error).message,
		});
	}

	if (userCamera) {
		if (isIOS) userCamera.stop();
		cameras.push(userCamera);
	}

	// Step 2: For any that failed, try fallback by deviceId
	if (cameras.length < 2) {
		const allDevices = await getAllVideoDevices();
		const usedDeviceIds = cameras.map((c) => c.deviceId);

		for (const device of allDevices) {
			if (usedDeviceIds.includes(device.deviceId)) {
				continue; // Already have this camera
			}

			try {
				const result = await getVideoStream({ deviceId: device.deviceId });
				const camera = new Camera(result);
				if (isIOS) camera.stop();
				cameras.push(camera);

				debugLog("Got camera by deviceId fallback", {
					deviceId: device.deviceId,
				});
			} catch (e) {
				debugLog(`Fallback device ${device.deviceId.slice(0, 8)}... failed`, {
					name: (e as Error).name,
					message: (e as Error).message,
				});
			}

			if (cameras.length >= 2) {
				break; // Got both cameras
			}
		}
	}

	debugLog(`Total cameras obtained: ${cameras.length}`);

	return cameras;
}
