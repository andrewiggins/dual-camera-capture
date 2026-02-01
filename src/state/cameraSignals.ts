import { signal, computed } from "@preact/signals";
import type { Camera } from "../getCameras.ts";

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// Core camera state
export const mainCamera = signal<Camera | null>(null);
export const overlayCamera = signal<Camera | null>(null);
export const isIOS = signal(false);
export const cameraInitState = signal<"pending" | "ready" | "error">("pending");
export const hasDualCameras = computed(() => overlayCamera.value !== null);

// Capture mode
export type CaptureMode = "live" | "sequential";
export const currentMode = signal<CaptureMode>("live");
export const sequentialStep = signal<0 | 1 | 2>(0);
export const capturedOverlay = signal<OffscreenCanvas | null>(null);

// Overlay position (updated only on snap, not during drag)
export const overlayCorner = signal<Corner>("top-left");
