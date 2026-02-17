import { createContext } from "preact";
import { useContext, useRef, useEffect, useCallback } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { MutableRef } from "preact/hooks";
import { debugLog } from "../debugLog.ts";
import { getCameras, type Camera } from "../getCameras.ts";
import {
	mainCamera,
	overlayCamera,
	isIOS as isIOSSignal,
	cameraInitState,
	hasDualCameras,
	overlayCorner,
	currentMode,
	sequentialStep,
} from "../state/cameraSignals.ts";
import { showStatus } from "../showStatus.ts";

interface CameraContextValue {
	mainVideoRef: MutableRef<HTMLVideoElement | null>;
	overlayVideoRef: MutableRef<HTMLVideoElement | null>;
	sequentialPreviewCanvasRef: MutableRef<HTMLCanvasElement | null>;
	captureAnimatedCanvasRef: MutableRef<HTMLCanvasElement | null>;
	captureDialogRef: MutableRef<HTMLDialogElement | null>;
	captureDialogCanvasRef: MutableRef<HTMLCanvasElement | null>;
	swapCameras: () => Promise<void>;
	pauseVideos: () => void;
	playVideos: () => void;
	stopAllStreams: () => Promise<void>;
	resumeAllStreams: () => Promise<void>;
	getMainCameraVideo: () => { camera: Camera; video: HTMLVideoElement } | null;
	getOverlayCameraVideo: () => {
		camera: Camera;
		video: HTMLVideoElement;
	} | null;
}

const CameraContext = createContext<CameraContextValue | null>(null);

export function useCameraContext(): CameraContextValue {
	const context = useContext(CameraContext);
	if (!context) {
		throw new Error("useCameraContext must be used within CameraProvider");
	}
	return context;
}

interface CameraProviderProps {
	children: ComponentChildren;
}

/**
 * iOS can't render more than one camera stream simultaneously due to WebKit limitations
 * https://bugs.webkit.org/show_bug.cgi?id=179363
 * https://bugs.webkit.org/show_bug.cgi?id=238492
 */
function detectIOS(): boolean {
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
	);
}

export function CameraProvider({ children }: CameraProviderProps) {
	const mainVideoRef = useRef<HTMLVideoElement | null>(null);
	const overlayVideoRef = useRef<HTMLVideoElement | null>(null);
	const sequentialPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const captureAnimatedCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const captureDialogRef = useRef<HTMLDialogElement | null>(null);
	const captureDialogCanvasRef = useRef<HTMLCanvasElement | null>(null);

	// Update video orientation classes based on camera shouldFlip
	const updateOrientation = useCallback(() => {
		const main = mainCamera.value;
		const overlay = overlayCamera.value;
		const mainEl = mainVideoRef.current;
		const overlayEl = overlayVideoRef.current;

		if (mainEl) {
			if (main?.shouldFlip) {
				debugLog("Flipping main camera video horizontally");
				mainEl.classList.add("front-camera");
			} else {
				debugLog("Setting main camera video to normal orientation");
				mainEl.classList.remove("front-camera");
			}
		}

		if (overlayEl) {
			if (overlay?.shouldFlip) {
				debugLog("Flipping overlay camera video horizontally");
				overlayEl.classList.add("front-camera");
			} else {
				debugLog("Setting overlay camera video to normal orientation");
				overlayEl.classList.remove("front-camera");
			}
		}
	}, []);

	// Update overlay aspect ratio to match viewport
	const updateOverlayDimensions = useCallback(() => {
		const video = mainVideoRef.current;
		if (!video) return;

		const width = video.clientWidth;
		const height = video.clientHeight;
		if (width === 0 || height === 0) return;

		const aspectRatio = width / height;
		const container = video.parentElement;
		if (container) {
			container.style.setProperty("--overlay-aspect-ratio", `${aspectRatio}`);
		}
	}, []);

	const swapCameras = useCallback(async () => {
		const main = mainCamera.value;
		const overlay = overlayCamera.value;
		if (!overlay) {
			debugLog("swapCameras() - no overlay camera");
			return;
		}

		debugLog("swapCameras()", {
			mainDeviceId: main?.deviceId,
			overlayDeviceId: overlay.deviceId,
		});

		// Swap the camera references
		mainCamera.value = overlay;
		overlayCamera.value = main;

		const mainEl = mainVideoRef.current;
		const overlayEl = overlayVideoRef.current;
		const ios = isIOSSignal.value;

		if (ios) {
			// iOS: stop old, start new (only one stream at a time)
			main?.stop();
			if (mainEl) {
				mainEl.srcObject = overlay ? await overlay.getStream() : null;
			}
			if (overlayEl) {
				overlayEl.srcObject = null;
			}
		} else {
			// Desktop: just swap srcObject references
			if (mainEl) {
				mainEl.srcObject = overlay ? await overlay.getStream() : null;
			}
			if (overlayEl) {
				overlayEl.srcObject = main ? await main.getStream() : null;
			}
		}

		updateOrientation();
	}, [updateOrientation]);

	const pauseVideos = useCallback(() => {
		debugLog("pauseVideos()");
		mainVideoRef.current?.pause();
		overlayVideoRef.current?.pause();
	}, []);

	const playVideos = useCallback(() => {
		debugLog("playVideos()");
		mainVideoRef.current?.play();
		overlayVideoRef.current?.play();
	}, []);

	const stopAllStreams = useCallback(async () => {
		debugLog("stopAllStreams()");
		mainCamera.value?.stop();
		overlayCamera.value?.stop();
		if (mainVideoRef.current) {
			mainVideoRef.current.srcObject = null;
		}
		if (overlayVideoRef.current) {
			overlayVideoRef.current.srcObject = null;
			overlayVideoRef.current.classList.remove("stream-ready");
		}
	}, []);

	const resumeAllStreams = useCallback(async () => {
		const main = mainCamera.value;
		const overlay = overlayCamera.value;
		const ios = isIOSSignal.value;

		debugLog("resumeAllStreams()", {
			mainDeviceId: main?.deviceId,
			overlayDeviceId: overlay?.deviceId,
			isIOS: ios,
		});

		if (main && mainVideoRef.current) {
			mainVideoRef.current.srcObject = await main.getStream();
		}
		if (overlay && !ios && overlayVideoRef.current) {
			overlayVideoRef.current.srcObject = await overlay.getStream();
		}

		updateOrientation();
	}, [updateOrientation]);

	const getMainCameraVideo = useCallback(() => {
		const camera = mainCamera.value;
		const video = mainVideoRef.current;
		if (!camera || !video) return null;
		return { camera, video };
	}, []);

	const getOverlayCameraVideo = useCallback(() => {
		const camera = overlayCamera.value;
		const video = overlayVideoRef.current;
		if (!camera || !video) return null;
		return { camera, video };
	}, []);

	// Initialize cameras on mount
	useEffect(() => {
		const initCameras = async () => {
			const ios = detectIOS();
			isIOSSignal.value = ios;

			debugLog("CameraProvider.init()", { isIOS: ios });
			showStatus("Initializing cameras...", 2000);

			const cameras = await getCameras(ios);
			if (cameras.length === 0) {
				debugLog("No cameras found", null, true);
				showStatus("Error: No cameras found");
				cameraInitState.value = "error";
				return;
			}

			debugLog(`Detected ${cameras.length} camera(s)`, {
				cameras: cameras.map((c) => ({
					deviceId: c.deviceId,
					facingMode: c.facingMode,
				})),
			});

			mainCamera.value = cameras[0];
			overlayCamera.value = cameras.length > 1 ? cameras[1] : null;

			// Set up main video stream
			const mainEl = mainVideoRef.current;
			if (mainEl && cameras[0]) {
				mainEl.srcObject = await cameras[0].getStream();
			}

			// Set up overlay video stream (non-iOS only)
			const overlayEl = overlayVideoRef.current;
			if (overlayEl && cameras.length > 1 && !ios) {
				overlayEl.srcObject = await cameras[1].getStream();
			}

			updateOrientation();

			// Force sequential mode on iOS with multiple cameras
			// iOS Safari cannot run two camera streams simultaneously
			if (ios && cameras.length > 1) {
				debugLog(
					"iOS detected with multiple cameras - forcing sequential capture mode",
				);
				currentMode.value = "sequential";
				sequentialStep.value = 1;
			}

			cameraInitState.value = "ready";
		};

		initCameras();
	}, [updateOrientation]);

	// Handle video metadata loaded to update overlay dimensions
	useEffect(() => {
		const mainEl = mainVideoRef.current;
		if (!mainEl) return;

		const handleLoadedMetadata = () => updateOverlayDimensions();
		mainEl.addEventListener("loadedmetadata", handleLoadedMetadata);

		return () => {
			mainEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
		};
	}, [updateOverlayDimensions]);

	// Show overlay video once stream is playing
	useEffect(() => {
		const overlayEl = overlayVideoRef.current;
		if (!overlayEl) return;

		const handlePlaying = () => {
			overlayEl.classList.add("stream-ready");
		};
		overlayEl.addEventListener("playing", handlePlaying);

		return () => {
			overlayEl.removeEventListener("playing", handlePlaying);
		};
	}, []);

	// Handle window resize to update overlay dimensions
	useEffect(() => {
		const handleResize = () => updateOverlayDimensions();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [updateOverlayDimensions]);

	// Handle visibility change
	useEffect(() => {
		const handleVisibilityChange = async () => {
			debugLog("Visibility changed", { hidden: document.hidden });

			if (document.hidden) {
				await stopAllStreams();
			} else {
				showStatus("Resuming cameras...");
				try {
					await resumeAllStreams();
					debugLog("Cameras resumed successfully");
					showStatus("Cameras resumed!", 2000);
				} catch (e) {
					debugLog(
						"Failed to resume cameras",
						{ name: (e as Error).name, message: (e as Error).message },
						true,
					);
					showStatus("Error resuming cameras");
				}
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [stopAllStreams, resumeAllStreams]);

	const contextValue: CameraContextValue = {
		mainVideoRef,
		overlayVideoRef,
		sequentialPreviewCanvasRef,
		captureAnimatedCanvasRef,
		captureDialogRef,
		captureDialogCanvasRef,
		swapCameras,
		pauseVideos,
		playVideos,
		stopAllStreams,
		resumeAllStreams,
		getMainCameraVideo,
		getOverlayCameraVideo,
	};

	return (
		<CameraContext.Provider value={contextValue}>
			{children}
		</CameraContext.Provider>
	);
}

export { overlayCorner, hasDualCameras };
