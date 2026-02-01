import afterframe from "afterframe";
import "./CaptureAnimation.css";

function afterFrameAsync(): Promise<void> {
	return new Promise((resolve) => {
		afterframe(() => resolve());
	});
}

/**
 * Animate capture with ViewTransitions API
 * @param sourceCanvas OffscreenCanvas containing the captured image
 * @param transitionName The view-transition-name to use (must match destination element)
 * @param canvasElement The canvas element to use for the animation
 * @param showDestination Callback that shows the destination element (dialog/preview)
 */
export async function playCaptureAnimation(
	sourceCanvas: OffscreenCanvas,
	transitionName: string,
	canvasElement: HTMLCanvasElement | null,
	showDestination: () => void,
): Promise<void> {
	// Check for ViewTransitions support or missing canvas element
	if (!document.startViewTransition || !canvasElement) {
		// Fallback: just show destination immediately
		showDestination();
		return;
	}

	// Set canvas dimensions to match source
	canvasElement.width = sourceCanvas.width;
	canvasElement.height = sourceCanvas.height;

	// Draw OffscreenCanvas to visible canvas (sync operation)
	const ctx = canvasElement.getContext("2d")!;
	ctx.drawImage(sourceCanvas, 0, 0);

	canvasElement.style.viewTransitionName = transitionName;
	canvasElement.classList.add("active");

	// Let canvas render on screen first so ViewTransition doesn't animate it in
	await afterFrameAsync();

	// Start view transition
	const transition = document.startViewTransition(() => {
		// Hide source, show destination
		canvasElement.classList.remove("active");
		showDestination();
	});

	await transition.finished;

	// Clean up
	canvasElement.style.viewTransitionName = "";
	ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

/**
 * Play flash animation
 * @param flashElement The flash element to animate
 */
export async function playFlashAnimation(
	flashElement: HTMLDivElement | null,
): Promise<void> {
	if (!flashElement) return;

	const animation = flashElement.animate(
		[{ opacity: 0 }, { opacity: 0.7, offset: 0.3 }, { opacity: 0 }],
		{ duration: 150, easing: "ease-out" },
	);

	await animation.finished;
}
