import { MainVideo } from "./MainVideo.tsx";
import { OverlayVideo } from "./OverlayVideo.tsx";
import { SequentialPreview } from "./SequentialPreview.tsx";
import { SequentialInstructions } from "./SequentialInstructions.tsx";
import { CaptureAnimatedCanvas } from "./CaptureAnimatedCanvas.tsx";
import { CaptureFlash } from "./CaptureFlash.tsx";
import { StatusMessage } from "./StatusMessage.tsx";
import { Controls } from "./Controls.tsx";
import { SettingsButton } from "./SettingsButton.tsx";

export function MainLayout() {
	return (
		<div id="container">
			<MainVideo />
			<OverlayVideo />
			<SequentialPreview />
			<SequentialInstructions />
			<CaptureFlash />
			<CaptureAnimatedCanvas />
			<StatusMessage />
			<Controls />
			<SettingsButton />
		</div>
	);
}
