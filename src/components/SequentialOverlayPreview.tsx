import type { Ref } from "preact";

interface SequentialOverlayPreviewProps {
	show: boolean;
	canvasRef: Ref<HTMLCanvasElement>;
	hasCapture: boolean;
}

export function SequentialOverlayPreview({
	show,
	canvasRef,
	hasCapture,
}: SequentialOverlayPreviewProps) {
	return (
		<div id="sequentialOverlayPreview" class={show ? "show" : ""}>
			<canvas id="sequentialOverlayCanvas" ref={canvasRef} />
			<div
				id="sequentialOverlayPlaceholder"
				style={hasCapture ? { display: "none" } : { display: "flex" }}
			>
				Overlay preview
			</div>
		</div>
	);
}
