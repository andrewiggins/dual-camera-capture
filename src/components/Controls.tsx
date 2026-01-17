interface ControlsProps {
	showModeToggle: boolean;
	isSequentialMode: boolean;
	sequentialStep: number;
	switchDisabled: boolean;
	onModeToggle: () => void;
	onSwitch: () => void;
	onCapture: () => void;
}

export function Controls({
	showModeToggle,
	isSequentialMode,
	sequentialStep,
	switchDisabled,
	onModeToggle,
	onSwitch,
	onCapture,
}: ControlsProps) {
	// Determine button labels based on mode and step
	let modeToggleLabel = isSequentialMode ? "Live Mode" : "Sequential Mode";
	let captureLabel = "Capture Photo";
	let switchLabel = "Switch Cameras";

	if (isSequentialMode) {
		switchLabel = "Switch Camera";
		if (sequentialStep === 1) {
			captureLabel = "Capture Overlay";
		} else if (sequentialStep === 2) {
			captureLabel = "Capture & Download";
		}
	}

	return (
		<div id="controls">
			<button
				id="modeToggle"
				class={showModeToggle ? "show" : ""}
				onClick={onModeToggle}
			>
				{modeToggleLabel}
			</button>
			<button
				id="switchBtn"
				onClick={onSwitch}
				disabled={switchDisabled}
				style={
					switchDisabled ? { opacity: "0.5", cursor: "not-allowed" } : undefined
				}
			>
				{switchLabel}
			</button>
			<button id="captureBtn" onClick={onCapture}>
				{captureLabel}
			</button>
		</div>
	);
}
