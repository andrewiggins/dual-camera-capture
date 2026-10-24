import type { ComponentChildren } from "preact";
import { aspectRatio } from "../state/cameraSignals.ts";
import "./CameraFrame.css";

interface CameraFrameProps {
	children: ComponentChildren;
}

/**
 * Box sized to the selected capture aspect ratio. The main video fills it with
 * object-fit: cover, so the preview shows exactly the region that gets captured.
 */
export function CameraFrame({ children }: CameraFrameProps) {
	const ratioClass = `aspect-${aspectRatio.value.replace(":", "-")}`;
	return (
		<div id="cameraFrame" class={ratioClass}>
			{children}
		</div>
	);
}
