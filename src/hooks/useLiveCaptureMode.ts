import { useCallback } from "preact/hooks";
import { debugLog } from "../debugLog.ts";
import { drawVideoToCanvas, drawOverlayOnMainCanvas } from "../canvas.ts";
import { overlayCorner } from "../state/cameraSignals.ts";
import { capturedImage, captureDialogOpen } from "../state/uiSignals.ts";
import { playCaptureAnimation } from "../CaptureAnimation.ts";
import type { useCameraContext } from "../components/CameraProvider.tsx";

type CameraContextType = ReturnType<typeof useCameraContext>;

/**
 * Live Capture Mode - Simultaneous dual camera streams
 * Used on non-iOS devices that support multiple concurrent camera streams
 */
export function useLiveCaptureMode(ctx: CameraContextType) {
	const capture = useCallback(async () => {
		debugLog("LiveCaptureMode.capture()");

		ctx.pauseVideos();

		performance.mark("capture-start");
		performance.mark("draw-start");

		const mainVideo = ctx.getMainCameraVideo();
		if (!mainVideo) {
			debugLog("No main camera video available", null, true);
			return;
		}

		const mainImage = drawVideoToCanvas(
			mainVideo.video,
			mainVideo.camera.shouldFlip,
		);

		const overlayVideo = ctx.getOverlayCameraVideo();
		if (overlayVideo) {
			const overlayImage = drawVideoToCanvas(
				overlayVideo.video,
				overlayVideo.camera.shouldFlip,
			);
			drawOverlayOnMainCanvas(
				mainImage,
				overlayImage,
				mainVideo.video.clientWidth,
				overlayCorner.value,
			);
		}

		const drawTime = performance.measure("draw-duration", "draw-start");
		debugLog("Video frames drawn to canvas", {
			duration: drawTime.duration.toFixed(2),
		});

		// Play animation with OffscreenCanvas directly
		await playCaptureAnimation(
			mainImage,
			"dialog-image",
			ctx.captureAnimatedCanvasRef.current,
			() => {
				capturedImage.value = mainImage;
				captureDialogOpen.value = true;
			},
		);

		// Videos remain paused until dialog closes (handled by CaptureDialog)
	}, [ctx]);

	return { capture };
}
