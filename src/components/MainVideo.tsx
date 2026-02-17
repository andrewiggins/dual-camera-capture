import { useCameraContext } from "./CameraProvider.tsx";
import "./MainVideo.css";

export function MainVideo() {
	const { mainVideoRef } = useCameraContext();

	return <video id="mainVideo" ref={mainVideoRef} autoPlay playsInline />;
}
