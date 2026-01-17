import type { Ref } from "preact";

interface OverlayVideoProps {
	videoRef: Ref<HTMLVideoElement>;
	isOverlayFront: boolean;
	onClick: () => void;
	hidden?: boolean;
}

export function OverlayVideo({
	videoRef,
	isOverlayFront,
	onClick,
	hidden = false,
}: OverlayVideoProps) {
	return (
		<video
			id="overlayVideo"
			ref={videoRef}
			autoplay
			playsinline
			class={isOverlayFront ? "front-camera" : ""}
			onClick={onClick}
			style={hidden ? { display: "none" } : undefined}
		/>
	);
}
