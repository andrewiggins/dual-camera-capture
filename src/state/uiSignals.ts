import { signal } from "@preact/signals";

// Dialog state
export const captureDialogOpen = signal(false);
export const capturedImage = signal<OffscreenCanvas | null>(null);
export const settingsDialogOpen = signal(false);

// Status message
export const statusMessage = signal<string | null>(null);
export const statusTimeout = signal<number | null>(null);

// Settings
export const debugMode = signal(false);
export const updateAvailable = signal(false);
