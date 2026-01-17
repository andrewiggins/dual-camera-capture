import { useState, useCallback, useRef, useEffect } from "preact/hooks";
import type { Camera } from "../lib/camera.ts";
import * as CaptureUtils from "../lib/canvas.ts";

export interface UseLiveCaptureModeProps {
	cameras: Camera[];
	mainVideoRef: { current: HTMLVideoElement | null };
	overlayVideoRef: { current: HTMLVideoElement | null };
	canvasRef: { current: HTMLCanvasElement | null };
	showStatus: (message: string, duration?: number | null) => void;
}

export interface UseLiveCaptureModeResult {
	isMainFront: boolean;
	singleCameraMode: boolean;
	switchCameras: () => Promise<void>;
	capture: () => Promise<void>;
	pause: () => Promise<void>;
	resume: () => Promise<void>;
	init: () => Promise<void>;
}

/**
 * Hook to manage live (simultaneous) dual camera capture mode
 */
export function useLiveCaptureMode({
	cameras,
	mainVideoRef,
	overlayVideoRef,
	canvasRef,
	showStatus,
}: UseLiveCaptureModeProps): UseLiveCaptureModeResult {
	const [isMainFront, setIsMainFront] = useState(false);
	const [singleCameraMode, setSingleCameraMode] = useState(false);

	const mainCameraRef = useRef<Camera | null>(null);
	const overlayCameraRef = useRef<Camera | null>(null);

	const init = useCallback(async () => {
		if (cameras.length > 1) {
			// Both cameras available - dual camera mode
			mainCameraRef.current = cameras[0];
			overlayCameraRef.current = cameras[1];

			const mainStream = await mainCameraRef.current.getStream();
			const overlayStream = await overlayCameraRef.current.getStream();

			if (mainVideoRef.current) {
				mainVideoRef.current.srcObject = mainStream;
			}
			if (overlayVideoRef.current) {
				overlayVideoRef.current.srcObject = overlayStream;
			}

			setIsMainFront(mainCameraRef.current.facingMode === "user");
			setSingleCameraMode(false);
			showStatus("Cameras ready!", 2000);
		} else if (cameras.length === 1) {
			// Single camera mode
			mainCameraRef.current = cameras[0];
			overlayCameraRef.current = null;

			const mainStream = await mainCameraRef.current.getStream();
			if (mainVideoRef.current) {
				mainVideoRef.current.srcObject = mainStream;
			}

			setIsMainFront(mainCameraRef.current.facingMode === "user");
			setSingleCameraMode(true);
			showStatus("Single camera mode", 2000);
		} else {
			showStatus("Error: No cameras found");
		}
	}, [cameras, mainVideoRef, overlayVideoRef, showStatus]);

	const switchCameras = useCallback(async () => {
		if (!overlayCameraRef.current) return;

		// Swap cameras
		const temp = mainCameraRef.current;
		mainCameraRef.current = overlayCameraRef.current;
		overlayCameraRef.current = temp;

		if (mainVideoRef.current && mainCameraRef.current) {
			mainVideoRef.current.srcObject = await mainCameraRef.current.getStream();
		}
		if (overlayVideoRef.current && overlayCameraRef.current) {
			overlayVideoRef.current.srcObject =
				await overlayCameraRef.current.getStream();
		}

		const newIsMainFront = mainCameraRef.current?.facingMode === "user";
		setIsMainFront(newIsMainFront);
		showStatus("Cameras switched!", 1500);
	}, [mainVideoRef, overlayVideoRef, showStatus]);

	const capture = useCallback(async () => {
		const canvas = canvasRef.current;
		const mainVideo = mainVideoRef.current;
		const overlayVideo = overlayVideoRef.current;

		if (!canvas || !mainVideo) return;

		const mainIsFront = mainCameraRef.current?.facingMode === "user";
		CaptureUtils.drawVideoToCanvas(mainVideo, canvas, mainIsFront);

		const ctx = canvas.getContext("2d")!;
		const overlayWidth = canvas.width * 0.25;
		const overlayX = 20;
		const overlayY = 20;
		const borderRadius = 12;

		if (overlayCameraRef.current && overlayVideo) {
			const overlayHeight =
				(overlayVideo.videoHeight / overlayVideo.videoWidth) * overlayWidth;

			// Create temp canvas with flipped overlay (front camera needs flip)
			const tempCanvas = document.createElement("canvas");
			CaptureUtils.drawVideoToCanvas(overlayVideo, tempCanvas, !mainIsFront);

			CaptureUtils.drawRoundedOverlay(
				ctx,
				tempCanvas,
				overlayX,
				overlayY,
				overlayWidth,
				overlayHeight,
				borderRadius,
			);
		} else {
			CaptureUtils.drawErrorOverlay(
				ctx,
				overlayX,
				overlayY,
				overlayWidth,
				borderRadius,
			);
		}

		try {
			await CaptureUtils.downloadCanvas(canvas);
			showStatus("Photo captured!", 2000);
		} catch {
			showStatus("Error: Failed to capture photo");
		}
	}, [canvasRef, mainVideoRef, overlayVideoRef, showStatus]);

	const pause = useCallback(async () => {
		cameras.forEach((camera) => camera.stop());
		if (mainVideoRef.current) {
			mainVideoRef.current.srcObject = null;
		}
		if (overlayVideoRef.current) {
			overlayVideoRef.current.srcObject = null;
		}
	}, [cameras, mainVideoRef, overlayVideoRef]);

	const resume = useCallback(async () => {
		showStatus("Resuming cameras...");

		if (mainCameraRef.current && overlayCameraRef.current) {
			try {
				const mainStream = await mainCameraRef.current.getStream();
				const overlayStream = await overlayCameraRef.current.getStream();
				if (mainVideoRef.current) {
					mainVideoRef.current.srcObject = mainStream;
				}
				if (overlayVideoRef.current) {
					overlayVideoRef.current.srcObject = overlayStream;
				}
				showStatus("Cameras resumed!", 2000);
			} catch {
				showStatus("Error resuming cameras");
			}
		} else if (mainCameraRef.current) {
			try {
				const mainStream = await mainCameraRef.current.getStream();
				if (mainVideoRef.current) {
					mainVideoRef.current.srcObject = mainStream;
				}
				showStatus("Camera resumed!", 2000);
			} catch {
				showStatus("Error resuming camera");
			}
		} else {
			showStatus("Error: No cameras found");
		}
	}, [mainVideoRef, overlayVideoRef, showStatus]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cameras.forEach((camera) => camera.stop());
		};
	}, [cameras]);

	return {
		isMainFront,
		singleCameraMode,
		switchCameras,
		capture,
		pause,
		resume,
		init,
	};
}
