import { useCameraContext } from "./CameraProvider.tsx";
import "../CaptureAnimation.css";

export function CaptureAnimatedCanvas() {
	const { captureAnimatedCanvasRef } = useCameraContext();

	return <canvas id="captureAnimatedImage" ref={captureAnimatedCanvasRef} />;
}
