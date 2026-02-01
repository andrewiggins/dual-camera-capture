import { useCameraContext } from "./CameraProvider.tsx";
import { useOverlayPosition } from "../hooks/useOverlayPosition.ts";
import {
	currentMode,
	hasDualCameras,
	sequentialStep,
	overlayCorner,
} from "../state/cameraSignals.ts";
import "./OverlayPosition.css";

export function SequentialPreview() {
	const { sequentialPreviewCanvasRef, swapCameras } = useCameraContext();
	const { overlayRef } = useOverlayPosition<HTMLDivElement>({
		onTap: swapCameras,
	});

	// Show in sequential mode with dual cameras
	const isSequentialMode = currentMode.value === "sequential";
	const showPreview = hasDualCameras.value && isSequentialMode;

	// Show placeholder when step 1 (overlay not yet captured)
	const showPlaceholder = sequentialStep.value <= 1;

	return (
		<div
			id="sequentialOverlayPreview"
			ref={overlayRef}
			class={`overlay-corner-${overlayCorner.value} ${showPreview ? "show" : ""}`}
		>
			<canvas id="sequentialOverlayCanvas" ref={sequentialPreviewCanvasRef} />
			<div
				id="sequentialOverlayPlaceholder"
				style={{ display: showPlaceholder ? "flex" : "none" }}
			>
				Overlay preview
			</div>
		</div>
	);
}
