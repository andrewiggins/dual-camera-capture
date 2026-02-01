import { useCameraContext } from "./CameraProvider.tsx";
import { useOverlayPosition } from "../hooks/useOverlayPosition.ts";
import {
	hasDualCameras,
	currentMode,
	overlayCorner,
} from "../state/cameraSignals.ts";
import "../OverlayPosition.css";

export function OverlayVideo() {
	const { overlayVideoRef, swapCameras } = useCameraContext();
	const { overlayRef } = useOverlayPosition<HTMLVideoElement>({
		onTap: swapCameras,
	});

	// Combine refs
	const setRef = (el: HTMLVideoElement | null) => {
		overlayVideoRef.current = el;
		overlayRef.current = el;
	};

	// In live mode with dual cameras, show overlay video
	// In sequential mode, overlay video is hidden (preview canvas shown instead)
	const isLiveMode = currentMode.value === "live";
	const showOverlay = hasDualCameras.value && isLiveMode;

	return (
		<>
			<video
				id="overlayVideo"
				ref={setRef}
				autoPlay
				playsInline
				class={`overlay-corner-${overlayCorner.value}`}
				style={{ display: showOverlay ? "" : "none" }}
			/>
			<OverlayError />
		</>
	);
}

function OverlayError() {
	const { overlayRef } = useOverlayPosition<HTMLDivElement>({});
	const showError = !hasDualCameras.value;

	return (
		<div
			id="overlayError"
			ref={overlayRef}
			class={`overlay-corner-${overlayCorner.value} ${showError ? "show" : ""}`}
		>
			<div class="error-content">
				<div class="error-icon">⚠️</div>
				<div class="error-message">Second camera not available</div>
			</div>
		</div>
	);
}
