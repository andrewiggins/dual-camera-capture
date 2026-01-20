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
	private imageElement: HTMLImageElement;

	constructor() {
		this.flashElement = document.getElementById(
			"captureFlash",
		) as HTMLDivElement;
		this.imageElement = document.getElementById(
			"captureAnimatedImage",
		) as HTMLImageElement;
	}

	/**
	 * Animate capture with ViewTransitions API
	 * @param imageSource Blob URL for captured image
	 * @param transitionName The view-transition-name to use (must match destination element)
	 * @param showDestination Callback that shows the destination element (dialog/preview)
	 */
	async play(
		imageSource: string,
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

		// Set up source image (fullscreen) with matching transition name
		this.imageElement.src = imageSource;
		this.imageElement.style.viewTransitionName = transitionName;
		this.imageElement.classList.add("active");

		// Let captureImage render on screen first so ViewTransition doesn't animate it in
		await afterFrameAsync();

		// Start view transition
		const transition = document.startViewTransition(() => {
			// Hide source, show destination
			this.imageElement.classList.remove("active");
			showDestination();
		});

		await transition.finished;

		// Clean up
		this.imageElement.style.viewTransitionName = "";
		this.imageElement.src = "";
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
