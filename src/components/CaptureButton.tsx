import { debugLog } from "../debugLog.ts";
import { useCameraContext } from "./CameraProvider.tsx";
import { useLiveCaptureMode } from "../hooks/useLiveCaptureMode.ts";
import { useSequentialCaptureMode } from "../hooks/useSequentialCaptureMode.ts";
import {
	currentMode,
	hasDualCameras,
	sequentialStep,
} from "../state/cameraSignals.ts";
import "./CaptureButton.css";

export function CaptureButton() {
	const cameraContext = useCameraContext();
	const liveCapture = useLiveCaptureMode(cameraContext);
	const sequentialCapture = useSequentialCaptureMode(cameraContext);

	const handleClick = async () => {
		debugLog("Capture button clicked");

		if (currentMode.value === "sequential") {
			await sequentialCapture.capture();
		} else {
			await liveCapture.capture();
		}
	};

	// Button text for sequential mode
	let buttonText = "";
	if (currentMode.value === "sequential" && hasDualCameras.value) {
		buttonText =
			sequentialStep.value <= 1 ? "Capture Overlay" : "Capture & Download";
	}

	return (
		<button
			id="captureBtn"
			type="button"
			aria-label="Capture Photo"
			onClick={handleClick}
		>
			{buttonText}
		</button>
	);
}
