import { useCallback } from "preact/hooks";
import { debugLog } from "../debugLog.ts";
import { drawVideoToCanvas, drawOverlayOnMainCanvas } from "../canvas.ts";
import {
	sequentialStep,
	capturedOverlay,
	hasDualCameras,
	overlayCorner,
} from "../state/cameraSignals.ts";
import { capturedImage, captureDialogOpen } from "../state/uiSignals.ts";
import { showStatus } from "../showStatus.ts";
import { playCaptureAnimation } from "../animation.ts";
import type { useCameraContext } from "../components/CameraProvider.tsx";

type CameraContextType = ReturnType<typeof useCameraContext>;

/**
 * Sequential Capture Mode - One camera at a time
 * Required for iOS Safari which cannot run two camera streams simultaneously
 */
export function useSequentialCaptureMode(ctx: CameraContextType) {
	const captureOverlayPhoto = useCallback(async () => {
		debugLog("SequentialCaptureMode.captureOverlay()");

		const mainVideo = ctx.getMainCameraVideo();
		if (!mainVideo) {
			debugLog("No main camera video available", null, true);
			return;
		}

		const overlay = drawVideoToCanvas(
			mainVideo.video,
			mainVideo.camera.shouldFlip,
		);
		capturedOverlay.value = overlay;

		debugLog("Overlay captured", {
			width: overlay.width,
			height: overlay.height,
		});

		const previewCanvas = ctx.sequentialPreviewCanvasRef.current;

		// Play animation with OffscreenCanvas directly, then show preview
		await playCaptureAnimation(
			overlay,
			"overlay-preview",
			ctx.captureAnimatedCanvasRef.current,
			async () => {
				// Apply view-transition-name dynamically to canvas during transition
				if (previewCanvas) {
					previewCanvas.style.viewTransitionName = "overlay-preview";
					previewCanvas.width = overlay.width;
					previewCanvas.height = overlay.height;
					previewCanvas.getContext("2d")!.drawImage(overlay, 0, 0);
				}

				await ctx.swapCameras();
			},
		);

		if (previewCanvas) {
			previewCanvas.style.viewTransitionName = "";
		}

		// Move to step 2
		sequentialStep.value = 2;
		showStatus("Overlay captured! Now capture main photo.", 2000);
	}, [ctx]);

	const captureMainPhoto = useCallback(async () => {
		debugLog("SequentialCaptureMode.captureMain()");

		const mainVideo = ctx.getMainCameraVideo();
		if (!mainVideo) {
			debugLog("No main camera video available", null, true);
			return;
		}

		const canvas = drawVideoToCanvas(
			mainVideo.video,
			mainVideo.camera.shouldFlip,
		);

		const overlay = capturedOverlay.value;
		if (overlay) {
			drawOverlayOnMainCanvas(
				canvas,
				overlay,
				mainVideo.video.clientWidth,
				overlayCorner.value,
			);
		}

		debugLog("Photo capture complete");

		// Play animation with OffscreenCanvas directly
		await playCaptureAnimation(
			canvas,
			"dialog-image",
			ctx.captureAnimatedCanvasRef.current,
			() => {
				// Open dialog synchronously so view transition can snapshot it
				const dialog = ctx.captureDialogRef.current;
				const dialogCanvas = ctx.captureDialogCanvasRef.current;
				if (dialog && dialogCanvas) {
					dialogCanvas.width = canvas.width;
					dialogCanvas.height = canvas.height;
					dialogCanvas.getContext("2d")!.drawImage(canvas, 0, 0);
					dialog.showModal();
				}
				capturedImage.value = canvas;
				captureDialogOpen.value = true;
			},
		);

		// Reset for next capture if dual cameras
		if (hasDualCameras.value) {
			await resetSequentialMode(ctx);
		}
	}, [ctx]);

	const resetSequentialMode = useCallback(
		async (context: CameraContextType) => {
			debugLog("SequentialCaptureMode.reset()");

			capturedOverlay.value = null;
			sequentialStep.value = 1;

			// Clear preview and show placeholder
			const previewCanvas = context.sequentialPreviewCanvasRef.current;
			if (previewCanvas) {
				previewCanvas
					.getContext("2d")!
					.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
			}

			// Swap back to the original camera
			await context.swapCameras();
		},
		[],
	);

	const capture = useCallback(async () => {
		debugLog("SequentialCaptureMode.capture()", {
			step: sequentialStep.value,
		});

		ctx.pauseVideos();

		const step = sequentialStep.value;

		if (step === 0) {
			// Single camera mode - reuse captureMain (no overlay, no reset)
			await captureMainPhoto();
		} else if (step === 1) {
			await captureOverlayPhoto();
			ctx.playVideos();
		} else if (step === 2) {
			await captureMainPhoto();
			// Videos remain paused until dialog closes
		}
	}, [ctx, captureOverlayPhoto, captureMainPhoto]);

	return { capture };
}
