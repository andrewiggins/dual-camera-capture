import type { CaptureDialog } from "./capture-dialog.ts";

export const captureBtn = document.getElementById(
	"captureBtn",
) as HTMLButtonElement;
export const switchBtn = document.getElementById(
	"switchBtn",
) as HTMLButtonElement;
export const overlayError = document.getElementById(
	"overlayError",
) as HTMLDivElement;
export const sequentialInstructions = document.getElementById(
	"sequentialInstructions",
) as HTMLDivElement;
export const sequentialOverlayPreview = document.getElementById(
	"sequentialOverlayPreview",
) as HTMLDivElement;
export const sequentialOverlayCanvas = document.getElementById(
	"sequentialOverlayCanvas",
) as HTMLCanvasElement;
export const sequentialOverlayPlaceholder = document.getElementById(
	"sequentialOverlayPlaceholder",
) as HTMLDivElement;
export const captureDialog = document.getElementById(
	"captureDialog",
) as CaptureDialog;
