import type { Ref } from "preact";

interface MainVideoProps {
	videoRef: Ref<HTMLVideoElement>;
	isMainFront: boolean;
}

export function MainVideo({ videoRef, isMainFront }: MainVideoProps) {
	return (
		<video
			id="mainVideo"
			ref={videoRef}
			autoplay
			playsinline
			class={isMainFront ? "front-camera" : ""}
		/>
	);
}
