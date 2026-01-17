import type { Camera } from "../lib/camera.ts";

/** Capture mode type identifier */
export type CaptureModeName = "live" | "sequential";

/** Sequential capture step */
export type SequentialStep = 0 | 1 | 2; // 0 = not started, 1 = capturing overlay, 2 = capturing main

/** Props for capture mode hooks */
export interface CaptureModeProps {
	cameras: Camera[];
	mainVideoRef: { current: HTMLVideoElement | null };
	overlayVideoRef: { current: HTMLVideoElement | null };
	canvasRef: { current: HTMLCanvasElement | null };
	showStatus: (message: string, duration?: number | null) => void;
}

/** State returned by capture mode hooks */
export interface CaptureModeState {
	isMainFront: boolean;
	hasOverlay: boolean;
	switchCameras: () => Promise<void>;
	capture: () => Promise<void>;
	pause: () => Promise<void>;
	resume: () => Promise<void>;
	cleanup: () => void;
}

/** Extended state for live capture mode */
export interface LiveCaptureModeState extends CaptureModeState {
	singleCameraMode: boolean;
}

/** Extended state for sequential capture mode */
export interface SequentialCaptureModeState extends CaptureModeState {
	step: SequentialStep;
	capturedOverlay: ImageData | null;
	overlayCanvasRef: { current: HTMLCanvasElement | null };
}
