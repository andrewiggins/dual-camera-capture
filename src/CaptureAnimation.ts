import "./CaptureAnimation.css";

export interface AnimationTarget {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Handles capture animation effects (flash + image transition)
 */
export class CaptureAnimation {
	private flashElement: HTMLDivElement;
	private imageElement: HTMLImageElement;

	constructor() {
		this.flashElement = document.getElementById("captureFlash") as HTMLDivElement;
		this.imageElement = document.getElementById("captureAnimatedImage") as HTMLImageElement;
	}

	/**
	 * Play the full capture animation (flash + image transition)
	 * @param imageSource Blob URL or data URL for the captured image
	 * @param target Final position and size for the image animation
	 */
	async play(imageSource: string, target: AnimationTarget): Promise<void> {
		// Start flash animation
		const flashPromise = this.playFlash();

		// Start image animation 50ms after flash begins (during peak brightness)
		await new Promise((resolve) => setTimeout(resolve, 50));
		const imagePromise = this.animateImage(imageSource, target);

		// Wait for both animations to complete
		await Promise.all([flashPromise, imagePromise]);
	}

	/**
	 * Play only the flash animation
	 */
	async playFlash(): Promise<void> {
		// Flash animation: 0 → 0.9 → 0 over 150ms
		// Peaks around 45ms (30% of duration)
		const animation = this.flashElement.animate(
			[
				{ opacity: 0, offset: 0 },
				{ opacity: 0.9, offset: 0.3 },
				{ opacity: 0, offset: 1 },
			],
			{
				duration: 150,
				easing: "ease-out",
				fill: "forwards",
			},
		);

		await animation.finished;
	}

	/**
	 * Animate image from fullscreen to target position
	 */
	private async animateImage(imageSource: string, target: AnimationTarget): Promise<void> {
		// Set up image
		this.imageElement.src = imageSource;

		// Start position: fullscreen
		const startX = 0;
		const startY = 0;
		const startWidth = window.innerWidth;
		const startHeight = window.innerHeight;

		// Apply initial position
		this.imageElement.style.left = `${startX}px`;
		this.imageElement.style.top = `${startY}px`;
		this.imageElement.style.width = `${startWidth}px`;
		this.imageElement.style.height = `${startHeight}px`;
		this.imageElement.style.opacity = "1";

		// Animate to target using Web Animation API
		// Material Design standard easing: cubic-bezier(0.4, 0, 0.2, 1)
		const animation = this.imageElement.animate(
			[
				{
					left: `${startX}px`,
					top: `${startY}px`,
					width: `${startWidth}px`,
					height: `${startHeight}px`,
					opacity: 1,
					borderRadius: "0px",
				},
				{
					left: `${target.x}px`,
					top: `${target.y}px`,
					width: `${target.width}px`,
					height: `${target.height}px`,
					opacity: 1,
					borderRadius: "12px",
				},
			],
			{
				duration: 300,
				easing: "cubic-bezier(0.4, 0, 0.2, 1)",
				fill: "forwards",
			},
		);

		await animation.finished;

		// Cancel animation to remove fill effect, then reset element
		animation.cancel();
		this.imageElement.style.opacity = "";
		this.imageElement.src = "";
	}
}

/**
 * Calculate the target position for the image in the capture dialog
 * @param imageWidth Original image width
 * @param imageHeight Original image height
 */
export function getDialogCenterTarget(imageWidth: number, imageHeight: number): AnimationTarget {
	const isMobile = window.innerWidth <= 768;

	// Dialog constraints (from CaptureDialog.css)
	const dialogMaxWidth = isMobile ? 0.95 : 0.9; // 95vw or 90vw
	const dialogPadding = isMobile ? 12 : 16;
	const actionsHeight = isMobile ? 90 : 100; // Space for action buttons

	// Available space for image
	const maxImageWidth = window.innerWidth * dialogMaxWidth - dialogPadding * 2;
	const maxImageHeight = window.innerHeight * dialogMaxWidth - actionsHeight;

	// Calculate actual rendered image size (maintaining aspect ratio)
	const imageAspect = imageWidth / imageHeight;
	let renderedWidth: number;
	let renderedHeight: number;

	if (maxImageWidth / maxImageHeight > imageAspect) {
		// Height constrained
		renderedHeight = Math.min(maxImageHeight, imageHeight);
		renderedWidth = renderedHeight * imageAspect;
	} else {
		// Width constrained
		renderedWidth = Math.min(maxImageWidth, imageWidth);
		renderedHeight = renderedWidth / imageAspect;
	}

	// Dialog content dimensions
	const dialogContentWidth = renderedWidth + dialogPadding * 2;
	const dialogContentHeight = renderedHeight + actionsHeight;

	// Dialog is centered on screen
	const dialogX = (window.innerWidth - dialogContentWidth) / 2;
	const dialogY = (window.innerHeight - dialogContentHeight) / 2;

	// Image position within dialog (with padding offset)
	const targetX = dialogX + dialogPadding;
	const targetY = dialogY + dialogPadding;

	return {
		x: targetX,
		y: targetY,
		width: renderedWidth,
		height: renderedHeight,
	};
}

/**
 * Calculate the target position for the overlay preview in sequential mode
 */
export function getOverlayPreviewTarget(): AnimationTarget {
	// Overlay preview position (from index.css)
	const x = 20;
	const y = 20;

	// Overlay width is 25vw
	const width = window.innerWidth * 0.25;

	// Get aspect ratio from CSS variable, default to 3/4
	const container = document.getElementById("container");
	const aspectRatioValue = container
		? getComputedStyle(container).getPropertyValue("--overlay-aspect-ratio").trim()
		: "3 / 4";

	// Parse aspect ratio (e.g., "3 / 4" -> 0.75)
	const parts = aspectRatioValue.split("/").map((s) => parseFloat(s.trim()));
	const aspectRatio = parts.length === 2 ? parts[0] / parts[1] : 3 / 4;

	const height = width / aspectRatio;

	return { x, y, width, height };
}
