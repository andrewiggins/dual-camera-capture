/**
 * Interface for capture mode implementations
 * Both LiveCaptureMode and SequentialCaptureMode implement this interface
 */
export interface CaptureMode {
	init(): Promise<void>;
	switchCameras(): void;
	capture(): Promise<void>;
	cleanup(): void;
	pause(): void;
	resume(): Promise<void>;
}

/**
 * Camera facing mode type
 */
export type FacingMode = "environment" | "user";
