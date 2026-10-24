import { CameraFrame } from "./CameraFrame.tsx";
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
			<CameraFrame>
				<MainVideo />
				<OverlayVideo />
				<SequentialPreview />
				<CaptureAnimatedCanvas />
			</CameraFrame>
			<SequentialInstructions />
			<CaptureFlash />
			<StatusMessage />
			<Controls />
			<SettingsButton />
		</div>
	);
}
