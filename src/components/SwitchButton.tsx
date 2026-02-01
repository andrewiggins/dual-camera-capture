import { debugLog } from "../debugLog.ts";
import { useCameraContext } from "./CameraProvider.tsx";
import { hasDualCameras } from "../state/cameraSignals.ts";

export function SwitchButton() {
	const { swapCameras } = useCameraContext();
	const disabled = !hasDualCameras.value;

	const handleClick = async () => {
		debugLog("Switch button clicked");
		await swapCameras();
	};

	return (
		<button
			id="switchBtn"
			type="button"
			aria-label="Switch Cameras"
			onClick={handleClick}
			disabled={disabled}
			style={{
				opacity: disabled ? "0.5" : undefined,
				cursor: disabled ? "not-allowed" : undefined,
			}}
		>
			<svg width="24" height="24" aria-hidden="true">
				<use href="#icon-switch" />
			</svg>
		</button>
	);
}
