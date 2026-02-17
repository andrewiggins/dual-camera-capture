import {
	currentMode,
	hasDualCameras,
	sequentialStep,
} from "../state/cameraSignals.ts";
import "./SequentialInstructions.css";

export function SequentialInstructions() {
	const isSequentialMode = currentMode.value === "sequential";
	const showInstructions = hasDualCameras.value && isSequentialMode;

	const instruction =
		sequentialStep.value <= 1
			? "Step 1: Capture the overlay photo"
			: "Step 2: Capture the main photo";

	return (
		<div id="sequentialInstructions" class={showInstructions ? "show" : ""}>
			{instruction}
		</div>
	);
}
