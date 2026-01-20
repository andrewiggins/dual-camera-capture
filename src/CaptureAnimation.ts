import afterframe from "afterframe";
import "./CaptureAnimation.css";

function afterFrameAsync(): Promise<void> {
	return new Promise((resolve) => {
		afterframe(() => resolve());
	});
}

/**
 * Handles capture animation effects using ViewTransitions API
 */
export class CaptureAnimation {
	private flashElement: HTMLDivElement;
	private canvasElement: HTMLCanvasElement;

	constructor() {
		this.flashElement = document.getElementById(
			"captureFlash",
		) as HTMLDivElement;
		this.canvasElement = document.getElementById(
			"captureAnimatedImage",
		) as HTMLCanvasElement;
	}

	/**
	 * Animate capture with ViewTransitions API
	 * @param sourceCanvas OffscreenCanvas containing the captured image
	 * @param transitionName The view-transition-name to use (must match destination element)
	 * @param showDestination Callback that shows the destination element (dialog/preview)
	 */
	async play(
		sourceCanvas: OffscreenCanvas,
		transitionName: string,
		showDestination: () => void,
	): Promise<void> {
		// TODO: Determine how to best implement flash for visual feedback
		// await this.playFlash();

		// Check for ViewTransitions support
		if (!document.startViewTransition) {
			// Fallback: just show destination immediately
			showDestination();
			return;
		}

		// Set canvas dimensions to match source
		this.canvasElement.width = sourceCanvas.width;
		this.canvasElement.height = sourceCanvas.height;

		// Draw OffscreenCanvas to visible canvas (sync operation)
		const ctx = this.canvasElement.getContext("2d")!;
		ctx.drawImage(sourceCanvas, 0, 0);

		this.canvasElement.style.viewTransitionName = transitionName;
		this.canvasElement.classList.add("active");

		// Let canvas render on screen first so ViewTransition doesn't animate it in
		await afterFrameAsync();

		// Start view transition
		const transition = document.startViewTransition(() => {
			// Hide source, show destination
			this.canvasElement.classList.remove("active");
			showDestination();
		});

		await transition.finished;

		// Clean up
		this.canvasElement.style.viewTransitionName = "";
		ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
	}

	/**
	 * Play only the flash animation
	 */
	async playFlash(): Promise<Animation> {
		const animation = this.flashElement.animate(
			[{ opacity: 0 }, { opacity: 0.7, offset: 0.3 }, { opacity: 0 }],
			{ duration: 150, easing: "ease-out" },
		);

		return animation.finished;
	}
}
