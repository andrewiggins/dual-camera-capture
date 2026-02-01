import { useCameraContext } from "./CameraProvider.tsx";

export function MainVideo() {
	const { mainVideoRef } = useCameraContext();

	return <video id="mainVideo" ref={mainVideoRef} autoPlay playsInline />;
}
