import { debugLog } from "./debugLog.ts";

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * Manages overlay position with drag-to-snap functionality.
 * Handles pointer events for dragging and tapping on overlay elements.
 */
export class OverlayPosition {
	private elements: HTMLElement[];
	private currentCorner: Corner = "top-left";
	private isDragging = false;
	private hasMoved = false;
	private dragStartX = 0;
	private dragStartY = 0;
	private elementStartX = 0;
	private elementStartY = 0;
	private onTap: (() => void) | null;

	private readonly DRAG_THRESHOLD = 10; // px before drag activates

	constructor(elements: HTMLElement[], onTap?: () => void) {
		this.elements = elements;
		this.onTap = onTap ?? null;

		// Apply initial corner class to all elements
		this.applyCornerClass(this.currentCorner);

		// Bind event handlers
		this.handlePointerDown = this.handlePointerDown.bind(this);
		this.handlePointerMove = this.handlePointerMove.bind(this);
		this.handlePointerUp = this.handlePointerUp.bind(this);
		this.handlePointerCancel = this.handlePointerCancel.bind(this);

		// Add pointer event listeners to all elements
		for (const el of this.elements) {
			el.addEventListener("pointerdown", this.handlePointerDown);
		}
	}

	private handlePointerDown(e: PointerEvent): void {
		// Only handle primary button (left click / touch)
		if (e.button !== 0) return;

		const target = e.currentTarget as HTMLElement;

		// Capture pointer for continued tracking even if it leaves the element
		target.setPointerCapture(e.pointerId);

		this.isDragging = true;
		this.hasMoved = false;
		this.dragStartX = e.clientX;
		this.dragStartY = e.clientY;

		// Get current element position
		const rect = target.getBoundingClientRect();
		this.elementStartX = rect.left;
		this.elementStartY = rect.top;

		// Add move/up listeners to window for tracking during drag
		window.addEventListener("pointermove", this.handlePointerMove);
		window.addEventListener("pointerup", this.handlePointerUp);
		window.addEventListener("pointercancel", this.handlePointerCancel);

		debugLog("OverlayPosition.pointerdown", {
			x: e.clientX,
			y: e.clientY,
		});
	}

	private handlePointerMove(e: PointerEvent): void {
		if (!this.isDragging) return;

		const deltaX = e.clientX - this.dragStartX;
		const deltaY = e.clientY - this.dragStartY;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		// Check if we've moved past the threshold to start actual drag
		if (!this.hasMoved && distance > this.DRAG_THRESHOLD) {
			this.hasMoved = true;

			// Remove corner class and add dragging class to disable transitions
			for (const el of this.elements) {
				el.classList.remove(`overlay-corner-${this.currentCorner}`);
				el.classList.add("overlay-dragging");
			}

			debugLog("OverlayPosition.drag started");
		}

		if (this.hasMoved) {
			// Update position with inline styles during drag
			const newX = this.elementStartX + deltaX;
			const newY = this.elementStartY + deltaY;

			for (const el of this.elements) {
				el.style.left = `${newX}px`;
				el.style.top = `${newY}px`;
				el.style.right = "auto";
				el.style.bottom = "auto";
			}
		}
	}

	private handlePointerUp(e: PointerEvent): void {
		if (!this.isDragging) return;

		this.cleanupDragListeners();

		if (this.hasMoved) {
			// Calculate nearest corner based on element center
			const target = e.target as HTMLElement;
			const rect = target.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const newCorner = this.findNearestCorner(centerX, centerY);
			debugLog("OverlayPosition.snap", { corner: newCorner });

			// Calculate target position as left/top values for smooth animation
			const targetPos = this.calculateCornerPosition(newCorner, rect);

			// Remove dragging class to enable transitions, then animate to target
			for (const el of this.elements) {
				el.classList.remove("overlay-dragging");
				el.style.left = `${targetPos.left}px`;
				el.style.top = `${targetPos.top}px`;
				el.style.right = "auto";
				el.style.bottom = "auto";
			}

			// After transition completes, switch to corner class
			this.currentCorner = newCorner;
			const transitionDuration = 250; // matches CSS transition duration
			setTimeout(() => {
				for (const el of this.elements) {
					el.style.left = "";
					el.style.top = "";
					el.style.right = "";
					el.style.bottom = "";
				}
				this.applyCornerClass(this.currentCorner);
			}, transitionDuration);
		} else {
			// Was a tap (no significant movement)
			debugLog("OverlayPosition.tap");
			if (this.onTap) {
				this.onTap();
			}
		}

		this.isDragging = false;
		this.hasMoved = false;
	}

	private handlePointerCancel(): void {
		if (!this.isDragging) return;

		this.cleanupDragListeners();

		// Restore original corner position
		for (const el of this.elements) {
			el.classList.remove("overlay-dragging");
			el.style.left = "";
			el.style.top = "";
			el.style.right = "";
			el.style.bottom = "";
		}
		this.applyCornerClass(this.currentCorner);

		this.isDragging = false;
		this.hasMoved = false;

		debugLog("OverlayPosition.cancelled");
	}

	private cleanupDragListeners(): void {
		window.removeEventListener("pointermove", this.handlePointerMove);
		window.removeEventListener("pointerup", this.handlePointerUp);
		window.removeEventListener("pointercancel", this.handlePointerCancel);
	}

	private findNearestCorner(x: number, y: number): Corner {
		const isLeft = x < window.innerWidth / 2;
		const isTop = y < window.innerHeight / 2;

		if (isTop && isLeft) return "top-left";
		if (isTop && !isLeft) return "top-right";
		if (!isTop && isLeft) return "bottom-left";
		return "bottom-right";
	}

	/**
	 * Calculate the target left/top position for a corner.
	 * This allows smooth CSS transitions since we animate using the same properties.
	 */
	private calculateCornerPosition(
		corner: Corner,
		elementRect: DOMRect,
	): { left: number; top: number } {
		const margin = 20;
		// Bottom margin matches CSS: max(100px, calc(env(safe-area-inset-bottom) + 80px))
		// We approximate this since we can't easily read CSS env() values
		const safeAreaBottom =
			parseInt(
				getComputedStyle(document.documentElement).getPropertyValue(
					"--safe-area-inset-bottom",
				),
			) || 0;
		const bottomMargin = Math.max(100, safeAreaBottom + 80);

		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		switch (corner) {
			case "top-left":
				return { left: margin, top: margin };
			case "top-right":
				return {
					left: viewportWidth - elementRect.width - margin,
					top: margin,
				};
			case "bottom-left":
				return {
					left: margin,
					top: viewportHeight - elementRect.height - bottomMargin,
				};
			case "bottom-right":
				return {
					left: viewportWidth - elementRect.width - margin,
					top: viewportHeight - elementRect.height - bottomMargin,
				};
		}
	}

	private applyCornerClass(corner: Corner): void {
		const corners: Corner[] = [
			"top-left",
			"top-right",
			"bottom-left",
			"bottom-right",
		];

		for (const el of this.elements) {
			// Remove all corner classes
			for (const c of corners) {
				el.classList.remove(`overlay-corner-${c}`);
			}
			// Add the new corner class
			el.classList.add(`overlay-corner-${corner}`);
		}
	}

	getCorner(): Corner {
		return this.currentCorner;
	}

	cleanup(): void {
		this.cleanupDragListeners();

		for (const el of this.elements) {
			el.removeEventListener("pointerdown", this.handlePointerDown);
		}
	}
}
