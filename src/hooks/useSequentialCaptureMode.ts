import { useState, useCallback, useRef, useEffect } from "preact/hooks";
import type { Camera, FacingMode } from "../lib/camera.ts";
import * as CaptureUtils from "../lib/canvas.ts";

export interface UseSequentialCaptureModeProps {
	cameras: Camera[];
	mainVideoRef: { current: HTMLVideoElement | null };
	canvasRef: { current: HTMLCanvasElement | null };
	overlayCanvasRef: { current: HTMLCanvasElement | null };
	showStatus: (message: string, duration?: number | null) => void;
}

export interface UseSequentialCaptureModeResult {
	step: number; // 0 = not started, 1 = capturing overlay, 2 = capturing main
	isMainFront: boolean;
	capturedOverlay: ImageData | null;
	switchCameras: () => Promise<void>;
	capture: () => Promise<void>;
	pause: () => Promise<void>;
	resume: () => Promise<void>;
	init: () => Promise<void>;
}

/**
 * Hook to manage sequential (one-at-a-time) capture mode
 */
export function useSequentialCaptureMode({
	cameras,
	mainVideoRef,
	canvasRef,
	overlayCanvasRef,
	showStatus,
}: UseSequentialCaptureModeProps): UseSequentialCaptureModeResult {
	const [step, setStep] = useState(0);
	const [isMainFront, setIsMainFront] = useState(false);
	const [capturedOverlay, setCapturedOverlay] = useState<ImageData | null>(
		null,
	);

	const mainCameraRef = useRef<Camera | null>(null);

	const switchToCamera = useCallback(
		async (facingMode: FacingMode) => {
			mainCameraRef.current?.stop();

			const result: Camera | null =
				cameras.find((c) => c.facingMode === facingMode) ??
				cameras.find((c) => c.deviceId !== mainCameraRef.current?.deviceId) ??
				null;

			if (result) {
				mainCameraRef.current = result;
				const mainStream = await result.getStream();
				if (mainVideoRef.current) {
					mainVideoRef.current.srcObject = mainStream;
				}
				setIsMainFront(result.facingMode === "user");
			} else {
				showStatus("Error: No camera available");
			}
		},
		[cameras, mainVideoRef, showStatus],
	);

	const init = useCallback(async () => {
		setStep(1);
		await switchToCamera("environment");
	}, [switchToCamera]);

	const captureOverlay = useCallback(() => {
		const canvas = canvasRef.current;
		const mainVideo = mainVideoRef.current;
		const overlayCanvas = overlayCanvasRef.current;

		if (!canvas || !mainVideo) return;

		const mainIsFront = mainCameraRef.current?.facingMode === "user";
		CaptureUtils.drawVideoToCanvas(mainVideo, canvas, mainIsFront);

		// Store captured image
		const ctx = canvas.getContext("2d")!;
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		setCapturedOverlay(imageData);

		// Show preview
		if (overlayCanvas) {
			overlayCanvas.width = canvas.width;
			overlayCanvas.height = canvas.height;
			overlayCanvas.getContext("2d")!.putImageData(imageData, 0, 0);
		}

		// Move to step 2 and switch to opposite camera
		setStep(2);
		const nextFacing: FacingMode = mainIsFront ? "environment" : "user";
		switchToCamera(nextFacing);

		showStatus("Overlay captured! Now capture main photo.", 2000);
	}, [canvasRef, mainVideoRef, overlayCanvasRef, showStatus, switchToCamera]);

	const captureMain = useCallback(async () => {
		const canvas = canvasRef.current;
		const mainVideo = mainVideoRef.current;

		if (!canvas || !mainVideo) return;

		const mainIsFront = mainCameraRef.current?.facingMode === "user";
		CaptureUtils.drawVideoToCanvas(mainVideo, canvas, mainIsFront);

		if (capturedOverlay) {
			const ctx = canvas.getContext("2d")!;
			const overlayWidth = canvas.width * 0.25;
			const overlayHeight =
				(capturedOverlay.height / capturedOverlay.width) * overlayWidth;

			// Create temp canvas for overlay
			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = capturedOverlay.width;
			tempCanvas.height = capturedOverlay.height;
			tempCanvas.getContext("2d")!.putImageData(capturedOverlay, 0, 0);

			CaptureUtils.drawRoundedOverlay(
				ctx,
				tempCanvas,
				20,
				20,
				overlayWidth,
				overlayHeight,
				12,
			);
		}

		try {
			await CaptureUtils.downloadCanvas(canvas);
			showStatus("Photo captured!", 2000);

			// Reset for next capture
			setCapturedOverlay(null);
			setStep(1);

			// Clear preview canvas
			if (overlayCanvasRef.current) {
				const ctx = overlayCanvasRef.current.getContext("2d")!;
				ctx.clearRect(
					0,
					0,
					overlayCanvasRef.current.width,
					overlayCanvasRef.current.height,
				);
			}

			// Switch back to environment camera
			await switchToCamera("environment");
		} catch {
			showStatus("Error: Failed to capture photo");
		}
	}, [
		canvasRef,
		mainVideoRef,
		capturedOverlay,
		overlayCanvasRef,
		showStatus,
		switchToCamera,
	]);

	const capture = useCallback(async () => {
		if (step === 1) {
			captureOverlay();
		} else if (step === 2) {
			await captureMain();
		}
	}, [step, captureOverlay, captureMain]);

	const switchCameras = useCallback(async () => {
		const nextFacing: FacingMode = isMainFront ? "environment" : "user";
		await switchToCamera(nextFacing);
		showStatus("Camera switched!", 1500);
	}, [isMainFront, switchToCamera, showStatus]);

	const pause = useCallback(async () => {
		cameras.forEach((c) => c.stop());
		if (mainVideoRef.current) {
			mainVideoRef.current.srcObject = null;
		}
	}, [cameras, mainVideoRef]);

	const resume = useCallback(async () => {
		showStatus("Resuming camera...");

		if (mainCameraRef.current) {
			try {
				const mainStream = await mainCameraRef.current.getStream();
				if (mainVideoRef.current) {
					mainVideoRef.current.srcObject = mainStream;
				}
				showStatus("Camera resumed!", 2000);
			} catch {
				showStatus("Error resuming camera");
			}
		}
	}, [mainVideoRef, showStatus]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cameras.forEach((camera) => camera.stop());
		};
	}, [cameras]);

	return {
		step,
		isMainFront,
		capturedOverlay,
		switchCameras,
		capture,
		pause,
		resume,
		init,
	};
}
