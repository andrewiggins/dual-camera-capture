import { ModeToggleButton } from "./ModeToggleButton.tsx";
import { CaptureButton } from "./CaptureButton.tsx";
import { SwitchButton } from "./SwitchButton.tsx";

export function Controls() {
	return (
		<div id="controls" class="controls">
			<ModeToggleButton />
			<CaptureButton />
			<SwitchButton />
		</div>
	);
}
