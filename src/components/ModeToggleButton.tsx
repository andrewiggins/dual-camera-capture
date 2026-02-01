import { debugLog } from "../debugLog.ts";
import {
	currentMode,
	hasDualCameras,
	isIOS,
	sequentialStep,
	capturedOverlay,
} from "../state/cameraSignals.ts";
import { showStatus } from "../showStatus.ts";
import "./ModeToggleButton.css";

export function ModeToggleButton() {
	// Only show for non-iOS with multiple cameras
	const showButton = !isIOS.value && hasDualCameras.value;

	const handleClick = () => {
		if (isIOS.value) return;

		debugLog("Mode toggle clicked", { currentMode: currentMode.value });

		if (currentMode.value === "sequential") {
			// Switch to live mode - cleanup sequential state
			capturedOverlay.value = null;
			sequentialStep.value = 0;
			currentMode.value = "live";
			showStatus("Dual camera capture mode", 2000);
		} else {
			// Switch to sequential mode
			currentMode.value = "sequential";
			sequentialStep.value = 1;
			showStatus("Sequential capture mode", 2000);
		}
	};

	// Icon shows what clicking will switch TO
	const iconHref =
		currentMode.value === "sequential" ? "#icon-live" : "#icon-sequential";
	const ariaLabel =
		currentMode.value === "sequential" ? "Live Mode" : "Sequential Mode";

	return (
		<button
			id="modeToggle"
			type="button"
			aria-label={ariaLabel}
			onClick={handleClick}
			class={showButton ? "show" : ""}
		>
			<svg width="24" height="24" aria-hidden="true">
				<use href={iconHref} />
			</svg>
		</button>
	);
}
