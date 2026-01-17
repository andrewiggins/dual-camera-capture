import { useRef, useState, useEffect, useCallback } from "preact/hooks";
import { useCameras } from "./hooks/useCameras.ts";
import { useStatus } from "./hooks/useStatus.ts";
import { useDebug } from "./hooks/useDebug.ts";
import { useLiveCaptureMode } from "./hooks/useLiveCaptureMode.ts";
import { useSequentialCaptureMode } from "./hooks/useSequentialCaptureMode.ts";
import { useVisibilityChange } from "./hooks/useVisibilityChange.ts";
import { isIOS } from "./lib/ios-detection.ts";

import { StatusMessage } from "./components/StatusMessage.tsx";
import { MainVideo } from "./components/MainVideo.tsx";
import { OverlayVideo } from "./components/OverlayVideo.tsx";
import { OverlayError } from "./components/OverlayError.tsx";
import { SequentialOverlayPreview } from "./components/SequentialOverlayPreview.tsx";
import { SequentialInstructions } from "./components/SequentialInstructions.tsx";
import { Controls } from "./components/Controls.tsx";
import { DebugPanel } from "./components/DebugPanel.tsx";

import "./index.css";
import "./debug.css";

export function App() {
	// Refs for video and canvas elements
	const mainVideoRef = useRef<HTMLVideoElement>(null);
	const overlayVideoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const sequentialOverlayCanvasRef = useRef<HTMLCanvasElement>(null);

	// State for capture mode
	const [isSequentialMode, setIsSequentialMode] = useState(false);
	const [initialized, setInitialized] = useState(false);

	// Hooks
	const { cameras, isReady } = useCameras();
	const { message, isVisible, showStatus } = useStatus();
	const {
		isDebugMode,
		isPanelVisible,
		logs,
		togglePanel,
		clearLogs,
		debugLog,
	} = useDebug();

	// Live capture mode hook
	const liveMode = useLiveCaptureMode({
		cameras,
		mainVideoRef,
		overlayVideoRef,
		canvasRef,
		showStatus,
	});

	// Sequential capture mode hook
	const sequentialMode = useSequentialCaptureMode({
		cameras,
		mainVideoRef,
		canvasRef,
		overlayCanvasRef: sequentialOverlayCanvasRef,
		showStatus,
	});

	// Current mode based on state
	const currentMode = isSequentialMode ? sequentialMode : liveMode;

	// Initialize cameras when ready
	useEffect(() => {
		if (!isReady || initialized) return;

		async function initialize() {
			debugLog("App.init()", { isIOS, cameraCount: cameras.length });
			showStatus("Initializing cameras...");

			// Force sequential mode on iOS with multiple cameras
			if (isIOS && cameras.length >= 2) {
				debugLog(
					"iOS detected with multiple cameras - forcing sequential capture mode",
				);
				setIsSequentialMode(true);
				await sequentialMode.init();
			} else {
				await liveMode.init();
			}

			setInitialized(true);
		}

		initialize();
	}, [
		isReady,
		initialized,
		cameras,
		debugLog,
		showStatus,
		liveMode,
		sequentialMode,
	]);

	// Handle mode toggle
	const handleModeToggle = useCallback(async () => {
		if (isIOS) return; // Can't toggle on iOS

		debugLog("toggleMode()", { currentMode: isSequentialMode });

		if (isSequentialMode) {
			// Switch to live mode
			showStatus("Switching to live mode...");
			setIsSequentialMode(false);
			await liveMode.init();
		} else {
			// Switch to sequential mode
			showStatus("Sequential capture mode", 2000);
			setIsSequentialMode(true);
			await sequentialMode.init();
		}
	}, [isIOS, isSequentialMode, debugLog, showStatus, liveMode, sequentialMode]);

	// Handle visibility change
	const handleHidden = useCallback(async () => {
		debugLog("Visibility changed", { hidden: true });
		await currentMode.pause();
	}, [debugLog, currentMode]);

	const handleVisible = useCallback(async () => {
		debugLog("Visibility changed", { hidden: false });
		await currentMode.resume();
	}, [debugLog, currentMode]);

	useVisibilityChange(handleHidden, handleVisible);

	// Determine UI state
	const showModeToggle = !isIOS && cameras.length >= 2;
	const showOverlayError = !isSequentialMode && liveMode.singleCameraMode;
	const switchDisabled = !isSequentialMode && liveMode.singleCameraMode;

	return (
		<>
			<div id="container">
				<MainVideo
					videoRef={mainVideoRef}
					isMainFront={currentMode.isMainFront}
				/>
				<OverlayVideo
					videoRef={overlayVideoRef}
					isOverlayFront={!liveMode.isMainFront}
					onClick={() => currentMode.switchCameras()}
					hidden={isSequentialMode}
				/>
				<OverlayError show={showOverlayError} />

				{/* Sequential capture mode UI */}
				<SequentialOverlayPreview
					show={isSequentialMode}
					canvasRef={sequentialOverlayCanvasRef}
					hasCapture={sequentialMode.capturedOverlay !== null}
				/>
				<SequentialInstructions
					show={isSequentialMode}
					step={sequentialMode.step}
					isMainFront={sequentialMode.isMainFront}
				/>

				<Controls
					showModeToggle={showModeToggle}
					isSequentialMode={isSequentialMode}
					sequentialStep={sequentialMode.step}
					switchDisabled={switchDisabled}
					onModeToggle={handleModeToggle}
					onSwitch={() => currentMode.switchCameras()}
					onCapture={() => currentMode.capture()}
				/>

				<StatusMessage message={message} isVisible={isVisible} />

				<DebugPanel
					isDebugMode={isDebugMode}
					isPanelVisible={isPanelVisible}
					logs={logs}
					onToggle={togglePanel}
					onClear={clearLogs}
				/>
			</div>

			<canvas id="canvas" ref={canvasRef} />
		</>
	);
}
