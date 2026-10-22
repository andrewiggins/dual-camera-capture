import { useRef, useEffect, useCallback } from "preact/hooks";
import type { MutableRef } from "preact/hooks";
import { debugLog } from "../debugLog.ts";
import { overlayCorner, type Corner } from "../state/cameraSignals.ts";

const DRAG_THRESHOLD = 10; // px before drag activates

interface UseOverlayPositionOptions {
	onTap?: () => void;
}

interface UseOverlayPositionResult<T extends HTMLElement> {
	overlayRef: MutableRef<T | null>;
}

/**
 * Hook that manages overlay drag-to-snap functionality.
 * Uses refs directly during drag to avoid re-renders.
 * Updates overlayCorner signal only on snap completion.
 */
export function useOverlayPosition<T extends HTMLElement = HTMLElement>(
	options: UseOverlayPositionOptions = {},
): UseOverlayPositionResult<T> {
	const overlayRef = useRef<T | null>(null);
	const isDraggingRef = useRef(false);
	const hasMovedRef = useRef(false);
	const dragStartXRef = useRef(0);
	const dragStartYRef = useRef(0);
	const elementStartXRef = useRef(0);
	const elementStartYRef = useRef(0);
	// Bounds of the positioning container (camera frame), captured on pointerdown
	const boundsRef = useRef<DOMRect | null>(null);

	const getBounds = useCallback((el: HTMLElement): DOMRect => {
		const parent = el.offsetParent ?? document.documentElement;
		return parent.getBoundingClientRect();
	}, []);

	/** x/y are relative to the positioning container */
	const findNearestCorner = useCallback(
		(x: number, y: number, bounds: DOMRect): Corner => {
			const isLeft = x < bounds.width / 2;
			const isTop = y < bounds.height / 2;

			if (isTop && isLeft) return "top-left";
			if (isTop && !isLeft) return "top-right";
			if (!isTop && isLeft) return "bottom-left";
			return "bottom-right";
		},
		[],
	);

	const calculateCornerPosition = useCallback(
		(
			corner: Corner,
			elementRect: DOMRect,
			bounds: DOMRect,
		): { left: number; top: number } => {
			const margin = 20;
			// Bottom margin matches CSS: max(100px, calc(env(safe-area-inset-bottom) + 80px))
			const safeAreaBottom =
				parseInt(
					getComputedStyle(document.documentElement).getPropertyValue(
						"--safe-area-inset-bottom",
					),
				) || 0;
			const bottomMargin = Math.max(100, safeAreaBottom + 80);

			const frameWidth = bounds.width;
			const frameHeight = bounds.height;

			switch (corner) {
				case "top-left":
					return { left: margin, top: margin };
				case "top-right":
					return {
						left: frameWidth - elementRect.width - margin,
						top: margin,
					};
				case "bottom-left":
					return {
						left: margin,
						top: frameHeight - elementRect.height - bottomMargin,
					};
				case "bottom-right":
					return {
						left: frameWidth - elementRect.width - margin,
						top: frameHeight - elementRect.height - bottomMargin,
					};
			}
		},
		[],
	);

	const applyCornerClass = useCallback((corner: Corner) => {
		const el = overlayRef.current;
		if (!el) return;

		const corners: Corner[] = [
			"top-left",
			"top-right",
			"bottom-left",
			"bottom-right",
		];

		for (const c of corners) {
			el.classList.remove(`overlay-corner-${c}`);
		}
		el.classList.add(`overlay-corner-${corner}`);
	}, []);

	const handlePointerDown = useCallback(
		(e: PointerEvent) => {
			if (e.button !== 0) return;

			const target = e.currentTarget as HTMLElement;
			target.setPointerCapture(e.pointerId);

			isDraggingRef.current = true;
			hasMovedRef.current = false;
			dragStartXRef.current = e.clientX;
			dragStartYRef.current = e.clientY;

			const bounds = getBounds(target);
			boundsRef.current = bounds;
			const rect = target.getBoundingClientRect();
			elementStartXRef.current = rect.left - bounds.left;
			elementStartYRef.current = rect.top - bounds.top;

			debugLog("OverlayPosition.pointerdown", {
				x: e.clientX,
				y: e.clientY,
			});
		},
		[getBounds],
	);

	const handlePointerMove = useCallback((e: PointerEvent) => {
		if (!isDraggingRef.current) return;

		const el = overlayRef.current;
		if (!el) return;

		const deltaX = e.clientX - dragStartXRef.current;
		const deltaY = e.clientY - dragStartYRef.current;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		if (!hasMovedRef.current && distance > DRAG_THRESHOLD) {
			hasMovedRef.current = true;

			// Remove corner class and add dragging class to disable transitions
			el.classList.remove(`overlay-corner-${overlayCorner.value}`);
			el.classList.add("overlay-dragging");

			debugLog("OverlayPosition.drag started");
		}

		if (hasMovedRef.current) {
			const newX = elementStartXRef.current + deltaX;
			const newY = elementStartYRef.current + deltaY;

			el.style.left = `${newX}px`;
			el.style.top = `${newY}px`;
			el.style.right = "auto";
			el.style.bottom = "auto";
		}
	}, []);

	const handlePointerUp = useCallback(
		(_e: PointerEvent) => {
			if (!isDraggingRef.current) return;

			const el = overlayRef.current;
			if (!el) return;

			if (hasMovedRef.current) {
				const bounds = boundsRef.current ?? getBounds(el);
				const rect = el.getBoundingClientRect();
				const centerX = rect.left - bounds.left + rect.width / 2;
				const centerY = rect.top - bounds.top + rect.height / 2;

				const newCorner = findNearestCorner(centerX, centerY, bounds);
				debugLog("OverlayPosition.snap", { corner: newCorner });

				const targetPos = calculateCornerPosition(newCorner, rect, bounds);

				// Remove dragging class to enable transitions, then animate to target
				el.classList.remove("overlay-dragging");
				el.style.left = `${targetPos.left}px`;
				el.style.top = `${targetPos.top}px`;
				el.style.right = "auto";
				el.style.bottom = "auto";

				// After transition completes, switch to corner class
				const transitionDuration = 250; // matches CSS transition duration
				setTimeout(() => {
					el.style.left = "";
					el.style.top = "";
					el.style.right = "";
					el.style.bottom = "";
					applyCornerClass(newCorner);
					overlayCorner.value = newCorner;
				}, transitionDuration);
			} else {
				// Was a tap (no significant movement)
				debugLog("OverlayPosition.tap");
				options.onTap?.();
			}

			isDraggingRef.current = false;
			hasMovedRef.current = false;
		},
		[
			findNearestCorner,
			calculateCornerPosition,
			applyCornerClass,
			getBounds,
			options,
		],
	);

	const handlePointerCancel = useCallback(() => {
		if (!isDraggingRef.current) return;

		const el = overlayRef.current;
		if (!el) return;

		// Restore original corner position
		el.classList.remove("overlay-dragging");
		el.style.left = "";
		el.style.top = "";
		el.style.right = "";
		el.style.bottom = "";
		applyCornerClass(overlayCorner.value);

		isDraggingRef.current = false;
		hasMovedRef.current = false;

		debugLog("OverlayPosition.cancelled");
	}, [applyCornerClass]);

	useEffect(() => {
		const el = overlayRef.current;
		if (!el) return;

		// Apply initial corner class and touch-action
		el.style.touchAction = "none";
		applyCornerClass(overlayCorner.value);

		el.addEventListener("pointerdown", handlePointerDown);

		// Use document-level listeners for move/up to handle pointer leaving element
		const onPointerMove = (e: PointerEvent) => handlePointerMove(e);
		const onPointerUp = (e: PointerEvent) => handlePointerUp(e);
		const onPointerCancel = () => handlePointerCancel();

		document.addEventListener("pointermove", onPointerMove);
		document.addEventListener("pointerup", onPointerUp);
		document.addEventListener("pointercancel", onPointerCancel);

		return () => {
			el.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("pointerup", onPointerUp);
			document.removeEventListener("pointercancel", onPointerCancel);
		};
	}, [
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
		handlePointerCancel,
		applyCornerClass,
	]);

	return { overlayRef };
}
