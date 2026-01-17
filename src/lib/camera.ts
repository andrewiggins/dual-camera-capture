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

	async getStream(): Promise<MediaStream> {
		if (this.#stream) {
			return this.#stream;
		}

		this.#stream = await getVideoStream({ deviceId: this.deviceId });
		return this.#stream;
	}

	stop(): void {
		if (this.#stream) {
			this.#stream.getTracks().forEach((track) => track.stop());
			this.#stream = null;
		}
	}
}

/**
 * Video constraints for high resolution capture
 */
const VIDEO_CONSTRAINTS = {
	width: { ideal: 4096 },
	height: { ideal: 2160 },
};

/**
 * Detect available video input devices
 */
async function getAllVideoDevices(): Promise<MediaDeviceInfo[]> {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const videoDevices = devices.filter((d) => d.kind === "videoinput");
		return videoDevices;
	} catch {
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
			...VIDEO_CONSTRAINTS,
			deviceId: deviceId ? { exact: deviceId } : undefined,
			facingMode:
				facingMode === "environment" ? { exact: "environment" } : "user",
		},
		audio: false,
	});
}

export async function getCameras(): Promise<Camera[]> {
	const cameras: Camera[] = [];

	// Step 1: Try to get both cameras by facingMode first
	try {
		const result = await getVideoStream({ facingMode: "environment" });
		cameras.push(new Camera(result, "environment"));
	} catch {
		// Environment camera facingMode failed
	}

	try {
		const result = await getVideoStream({ facingMode: "user" });
		cameras.push(new Camera(result, "user"));
	} catch {
		// Front camera facingMode failed
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
				cameras.push(new Camera(result));
			} catch {
				// Fallback device failed
			}

			if (cameras.length >= 2) {
				break; // Got both cameras
			}
		}
	}

	return cameras;
}
