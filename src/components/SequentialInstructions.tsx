interface SequentialInstructionsProps {
	show: boolean;
	step: number;
	isMainFront: boolean;
}

export function SequentialInstructions({
	show,
	step,
	isMainFront,
}: SequentialInstructionsProps) {
	const camera = isMainFront ? "front" : "back";
	let text = "";

	if (step === 1) {
		text = `Step 1: Capture the overlay photo (${camera} camera)`;
	} else if (step === 2) {
		text = `Step 2: Capture the main photo (${camera} camera)`;
	}

	return (
		<div id="sequentialInstructions" class={show ? "show" : ""}>
			{text}
		</div>
	);
}
