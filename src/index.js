import { DEBUG, debugLog, initDebug } from "./debug.js";

// iOS detection - iOS Safari cannot run two camera streams simultaneously
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

let mainStream = null;
let overlayStream = null;
let mainVideoElement = document.getElementById("mainVideo");
let overlayVideoElement = document.getElementById("overlayVideo");
let isMainFront = false; // false = back camera is main, true = front camera is main

// iOS sequential capture state
let iosMode = false;
let iosCapturedOverlay = null; // ImageData of the first captured photo
let iosOverlayIsFront = false; // Was the overlay captured from front camera?
let iosStep = 0; // 0 = not started, 1 = capturing overlay, 2 = capturing main

// High resolution video constraints for better image quality
const videoConstraints = {
	width: { ideal: 4096 },
	height: { ideal: 2160 },
};

async function initCameras() {
	debugLog("initCameras() called", { isIOS });

	// Check if we have multiple cameras available
	let hasMultipleCameras = false;
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const videoDevices = devices.filter((d) => d.kind === "videoinput");
		hasMultipleCameras = videoDevices.length >= 2;
		debugLog(`Found ${videoDevices.length} video input device(s):`);
		videoDevices.forEach((d, i) => {
			debugLog(
				`  Device ${i}: ${d.label || "(no label)"} [${d.deviceId.slice(0, 8)}...]`
			);
		});
	} catch (e) {
		debugLog("Failed to enumerate devices", e, true);
	}

	// On iOS with multiple cameras, use sequential capture mode
	if (isIOS && hasMultipleCameras) {
		debugLog("iOS detected with multiple cameras - using sequential capture mode");
		iosMode = true;
		await initIOSMode();
		return;
	}

	/** @type {MediaStream | null} */
	let backStream = null;
	/** @type {MediaStream | null} */
	let frontStream = null;

	try {
		showStatus("Initializing cameras...");

		// Try to get back camera
		debugLog(
			"Attempting to get back camera (facingMode: environment)..."
		);
		try {
			backStream = await navigator.mediaDevices.getUserMedia({
				video: {
					...videoConstraints,
					facingMode: { exact: "environment" },
				},
				audio: false,
			});
			debugLog("Back camera obtained successfully", {
				tracks: backStream.getVideoTracks().map((t) => ({
					label: t.label,
					enabled: t.enabled,
					readyState: t.readyState,
					settings: t.getSettings(),
				})),
			});
		} catch (e) {
			debugLog(
				"Back camera not available",
				{ name: e.name, message: e.message },
				true
			);
			console.log("Back camera not available:", e);
		}

		// Try to get front camera
		debugLog("Attempting to get front camera (facingMode: user)...");
		try {
			frontStream = await navigator.mediaDevices.getUserMedia({
				video: { ...videoConstraints, facingMode: "user" },
				audio: false,
			});
			debugLog("Front camera obtained successfully", {
				tracks: frontStream.getVideoTracks().map((t) => ({
					label: t.label,
					enabled: t.enabled,
					readyState: t.readyState,
					settings: t.getSettings(),
				})),
			});
		} catch (e) {
			debugLog(
				"Front camera not available",
				{ name: e.name, message: e.message },
				true
			);
			console.log("Front camera not available:", e);
		}

		// Check what we got
		debugLog("Stream results", {
			hasBack: !!backStream,
			hasFront: !!frontStream,
		});

		if (backStream && frontStream) {
			// Both cameras available
			debugLog("Both cameras available - dual camera mode");
			mainStream = backStream;
			overlayStream = frontStream;
			mainVideoElement.srcObject = mainStream;
			overlayVideoElement.srcObject = overlayStream;
			updateCameraOrientation();
			showStatus("Cameras ready!", 2000);
		} else if (backStream || frontStream) {
			// Only one camera available
			debugLog("Only one camera available - single camera mode", {
				usingBack: !!backStream,
				usingFront: !!frontStream,
			});
			mainStream = backStream || frontStream;
			isMainFront = !!frontStream; // true if front camera is the only one
			mainVideoElement.srcObject = mainStream;
			updateCameraOrientation();
			document.getElementById("overlayError").classList.add("show");
			document.getElementById("switchBtn").disabled = true;
			document.getElementById("switchBtn").style.opacity = "0.5";
			document.getElementById("switchBtn").style.cursor = "not-allowed";
			showStatus("Single camera mode", 2000);
		} else {
			// No cameras via facingMode, try device enumeration
			debugLog("FacingMode failed, falling back to device enumeration");
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(
				(device) => device.kind === "videoinput"
			);
			debugLog(
				`Device enumeration found ${videoDevices.length} video device(s)`
			);

			if (videoDevices.length >= 2) {
				debugLog("Attempting to open two cameras by deviceId");
				const stream1 = await navigator.mediaDevices.getUserMedia({
					video: {
						...videoConstraints,
						deviceId: videoDevices[0].deviceId,
					},
				});
				debugLog("First camera opened", {
					deviceId: videoDevices[0].deviceId.slice(0, 8),
				});
				const stream2 = await navigator.mediaDevices.getUserMedia({
					video: {
						...videoConstraints,
						deviceId: videoDevices[1].deviceId,
					},
				});
				debugLog("Second camera opened", {
					deviceId: videoDevices[1].deviceId.slice(0, 8),
				});

				mainStream = stream1;
				overlayStream = stream2;
				mainVideoElement.srcObject = mainStream;
				overlayVideoElement.srcObject = overlayStream;
				showStatus("Cameras ready!", 2000);
			} else if (videoDevices.length === 1) {
				debugLog(
					"Only one device found via enumeration - single camera mode"
				);
				const stream = await navigator.mediaDevices.getUserMedia({
					video: {
						...videoConstraints,
						deviceId: videoDevices[0].deviceId,
					},
				});

				mainStream = stream;
				mainVideoElement.srcObject = mainStream;
				document.getElementById("overlayError").classList.add("show");
				document.getElementById("switchBtn").disabled = true;
				document.getElementById("switchBtn").style.opacity = "0.5";
				document.getElementById("switchBtn").style.cursor = "not-allowed";
				showStatus("Single camera mode", 2000);
			} else {
				debugLog("No video devices found at all", null, true);
				showStatus("Error: No cameras found");
			}
		}
	} catch (error) {
		debugLog(
			"FATAL ERROR in initCameras",
			{
				name: error.name,
				message: error.message,
				stack: error.stack,
			},
			true
		);
		console.error("Error accessing cameras:", error);
		showStatus("Error: " + error.message);
	}
}

// iOS Mode: Sequential capture since iOS can't run two cameras simultaneously
async function initIOSMode() {
	debugLog("initIOSMode() called");

	// Hide overlay video (we'll use a canvas instead for the captured image)
	overlayVideoElement.style.display = "none";

	// Show iOS-specific UI
	document.getElementById("iosInstructions").classList.add("show");
	document.getElementById("iosOverlayPreview").classList.add("show");

	// Update button text for iOS mode
	document.getElementById("captureBtn").textContent = "Capture Overlay";
	document.getElementById("switchBtn").textContent = "Switch Camera";

	// Start with back camera (for overlay capture)
	iosStep = 1;
	isMainFront = false;
	await switchToCamera("environment");

	updateIOSInstructions();
}

async function switchToCamera(facingMode) {
	debugLog("switchToCamera()", { facingMode });

	// Stop existing stream
	if (mainStream) {
		mainStream.getTracks().forEach((track) => track.stop());
		mainStream = null;
	}

	try {
		const constraints = {
			video: {
				...videoConstraints,
				facingMode: facingMode === "environment"
					? { exact: "environment" }
					: "user",
			},
			audio: false,
		};

		mainStream = await navigator.mediaDevices.getUserMedia(constraints);
		mainVideoElement.srcObject = mainStream;
		isMainFront = facingMode === "user";
		updateCameraOrientation();

		debugLog("Camera switched successfully", {
			facingMode,
			isMainFront,
			tracks: mainStream.getVideoTracks().map((t) => ({
				label: t.label,
				settings: t.getSettings(),
			})),
		});
	} catch (e) {
		debugLog("Failed to switch camera", { name: e.name, message: e.message }, true);
		showStatus("Error switching camera: " + e.message);
	}
}

function updateIOSInstructions() {
	const instructionsEl = document.getElementById("iosInstructions");
	const captureBtn = document.getElementById("captureBtn");

	if (iosStep === 1) {
		instructionsEl.textContent = `Step 1: Capture the overlay photo (${isMainFront ? "front" : "back"} camera)`;
		captureBtn.textContent = "Capture Overlay";
	} else if (iosStep === 2) {
		instructionsEl.textContent = `Step 2: Capture the main photo (${isMainFront ? "front" : "back"} camera)`;
		captureBtn.textContent = "Capture & Download";
	}
}

function iosCaptureOverlay() {
	debugLog("iosCaptureOverlay() called");

	const canvas = document.getElementById("canvas");
	const ctx = canvas.getContext("2d");

	// Capture current frame from video
	canvas.width = mainVideoElement.videoWidth;
	canvas.height = mainVideoElement.videoHeight;

	// Apply flip for front camera
	ctx.save();
	if (isMainFront) {
		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1);
	}
	ctx.drawImage(mainVideoElement, 0, 0);
	ctx.restore();

	// Store the captured image
	iosCapturedOverlay = ctx.getImageData(0, 0, canvas.width, canvas.height);
	iosOverlayIsFront = isMainFront;

	// Show preview of captured overlay
	const previewCanvas = document.getElementById("iosOverlayCanvas");
	previewCanvas.width = canvas.width;
	previewCanvas.height = canvas.height;
	const previewCtx = previewCanvas.getContext("2d");
	previewCtx.putImageData(iosCapturedOverlay, 0, 0);

	// Hide placeholder text
	document.getElementById("iosOverlayPlaceholder").style.display = "none";

	debugLog("Overlay captured", {
		width: iosCapturedOverlay.width,
		height: iosCapturedOverlay.height,
		wasFront: iosOverlayIsFront,
	});

	// Move to step 2 and switch to opposite camera
	iosStep = 2;
	const nextFacing = isMainFront ? "environment" : "user";
	switchToCamera(nextFacing);
	updateIOSInstructions();

	showStatus("Overlay captured! Now capture main photo.", 2000);
}

function iosCaptureMain() {
	debugLog("iosCaptureMain() called");

	const canvas = document.getElementById("canvas");
	const ctx = canvas.getContext("2d");

	// Set canvas size to match main video
	canvas.width = mainVideoElement.videoWidth;
	canvas.height = mainVideoElement.videoHeight;

	// Draw main video feed with flip if front camera
	ctx.save();
	if (isMainFront) {
		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1);
	}
	ctx.drawImage(mainVideoElement, 0, 0, canvas.width, canvas.height);
	ctx.restore();

	// Draw the previously captured overlay
	if (iosCapturedOverlay) {
		const overlayWidth = canvas.width * 0.25;
		const overlayHeight = (iosCapturedOverlay.height / iosCapturedOverlay.width) * overlayWidth;
		const overlayX = 20;
		const overlayY = 20;
		const borderRadius = 12;

		// Create temporary canvas for overlay image
		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = iosCapturedOverlay.width;
		tempCanvas.height = iosCapturedOverlay.height;
		const tempCtx = tempCanvas.getContext("2d");
		tempCtx.putImageData(iosCapturedOverlay, 0, 0);

		// Draw rounded rectangle for overlay
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(overlayX + borderRadius, overlayY);
		ctx.lineTo(overlayX + overlayWidth - borderRadius, overlayY);
		ctx.quadraticCurveTo(
			overlayX + overlayWidth,
			overlayY,
			overlayX + overlayWidth,
			overlayY + borderRadius
		);
		ctx.lineTo(overlayX + overlayWidth, overlayY + overlayHeight - borderRadius);
		ctx.quadraticCurveTo(
			overlayX + overlayWidth,
			overlayY + overlayHeight,
			overlayX + overlayWidth - borderRadius,
			overlayY + overlayHeight
		);
		ctx.lineTo(overlayX + borderRadius, overlayY + overlayHeight);
		ctx.quadraticCurveTo(
			overlayX,
			overlayY + overlayHeight,
			overlayX,
			overlayY + overlayHeight - borderRadius
		);
		ctx.lineTo(overlayX, overlayY + borderRadius);
		ctx.quadraticCurveTo(overlayX, overlayY, overlayX + borderRadius, overlayY);
		ctx.closePath();

		// Draw black border
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 6;
		ctx.stroke();

		// Clip and draw overlay
		ctx.clip();
		ctx.drawImage(tempCanvas, overlayX, overlayY, overlayWidth, overlayHeight);
		ctx.restore();
	}

	// Download the composite image
	debugLog("Converting canvas to blob...");
	canvas.toBlob((blob) => {
		if (!blob) {
			debugLog("ERROR: Failed to create blob from canvas", null, true);
			showStatus("Error: Failed to capture photo");
			return;
		}

		debugLog("Blob created", { size: blob.size, type: blob.type });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `dual-camera-${Date.now()}.png`;
		debugLog("Initiating download", { filename: a.download });
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		debugLog("Photo capture complete");
		showStatus("Photo captured!", 2000);

		// Reset for next capture
		iosResetCapture();
	}, "image/png");
}

function iosResetCapture() {
	debugLog("iosResetCapture() called");

	iosCapturedOverlay = null;
	iosStep = 1;

	// Clear preview and show placeholder
	const previewCanvas = document.getElementById("iosOverlayCanvas");
	const previewCtx = previewCanvas.getContext("2d");
	previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
	document.getElementById("iosOverlayPlaceholder").style.display = "flex";

	// Switch back to back camera for next overlay capture
	switchToCamera("environment");
	updateIOSInstructions();
}

function updateCameraOrientation() {
	debugLog("updateCameraOrientation()", { isMainFront: isMainFront });
	// Update CSS classes based on which camera is showing where
	if (isMainFront) {
		mainVideoElement.classList.add("front-camera");
	} else {
		mainVideoElement.classList.remove("front-camera");
	}

	// Overlay video shows the opposite camera of main
	if (overlayStream) {
		if (isMainFront) {
			overlayVideoElement.classList.remove("front-camera");
		} else {
			overlayVideoElement.classList.add("front-camera");
		}
	}
}

function switchCameras() {
	debugLog("switchCameras() called", {
		iosMode,
		mainStreamActive: mainStream?.active,
		overlayStreamActive: overlayStream?.active,
		isMainFront: isMainFront,
	});

	if (iosMode) {
		// In iOS mode, actually switch to the other camera
		const nextFacing = isMainFront ? "environment" : "user";
		switchToCamera(nextFacing);
		updateIOSInstructions();
		showStatus("Camera switched!", 1500);
		return;
	}

	// Non-iOS: Swap the streams
	const tempStream = mainStream;
	mainStream = overlayStream;
	overlayStream = tempStream;

	mainVideoElement.srcObject = mainStream;
	overlayVideoElement.srcObject = overlayStream;

	isMainFront = !isMainFront;
	updateCameraOrientation();
	debugLog("Cameras switched", { isMainFront: isMainFront });
	showStatus("Cameras switched!", 1500);
}

function capturePhoto() {
	debugLog("capturePhoto() called", {
		iosMode,
		iosStep,
		mainVideoWidth: mainVideoElement.videoWidth,
		mainVideoHeight: mainVideoElement.videoHeight,
		mainStreamActive: mainStream?.active,
		overlayStreamActive: overlayStream?.active,
		hasOverlay: !!overlayStream,
	});

	// iOS mode: sequential capture
	if (iosMode) {
		if (iosStep === 1) {
			iosCaptureOverlay();
		} else if (iosStep === 2) {
			iosCaptureMain();
		}
		return;
	}

	const canvas = document.getElementById("canvas");
	const ctx = canvas.getContext("2d");

	// Set canvas size to match main video
	canvas.width = mainVideoElement.videoWidth;
	canvas.height = mainVideoElement.videoHeight;

	if (canvas.width === 0 || canvas.height === 0) {
		debugLog(
			"WARNING: Canvas size is 0, video may not be ready",
			null,
			true
		);
	}

	// Draw main video feed with flip if front camera
	ctx.save();
	if (isMainFront) {
		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1);
	}
	ctx.drawImage(mainVideoElement, 0, 0, canvas.width, canvas.height);
	ctx.restore();

	// Calculate overlay position and size (top-left corner, maintaining aspect ratio)
	const overlayWidth = canvas.width * 0.25; // 25% of main width
	const overlayX = 20;
	const overlayY = 20;
	const borderRadius = 12;

	if (overlayStream) {
		// Draw second camera overlay
		const overlayHeight =
			(overlayVideoElement.videoHeight / overlayVideoElement.videoWidth) *
			overlayWidth;

		// Draw rounded rectangle for overlay background/border
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(overlayX + borderRadius, overlayY);
		ctx.lineTo(overlayX + overlayWidth - borderRadius, overlayY);
		ctx.quadraticCurveTo(
			overlayX + overlayWidth,
			overlayY,
			overlayX + overlayWidth,
			overlayY + borderRadius
		);
		ctx.lineTo(
			overlayX + overlayWidth,
			overlayY + overlayHeight - borderRadius
		);
		ctx.quadraticCurveTo(
			overlayX + overlayWidth,
			overlayY + overlayHeight,
			overlayX + overlayWidth - borderRadius,
			overlayY + overlayHeight
		);
		ctx.lineTo(overlayX + borderRadius, overlayY + overlayHeight);
		ctx.quadraticCurveTo(
			overlayX,
			overlayY + overlayHeight,
			overlayX,
			overlayY + overlayHeight - borderRadius
		);
		ctx.lineTo(overlayX, overlayY + borderRadius);
		ctx.quadraticCurveTo(
			overlayX,
			overlayY,
			overlayX + borderRadius,
			overlayY
		);
		ctx.closePath();

		// Draw black border
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 6;
		ctx.stroke();

		// Clip to rounded rectangle and draw overlay video
		ctx.clip();

		// Apply flip if overlay is showing front camera
		if (!isMainFront) {
			ctx.translate(overlayX + overlayWidth, overlayY);
			ctx.scale(-1, 1);
			ctx.translate(-overlayX, -overlayY);
		}

		ctx.drawImage(
			overlayVideoElement,
			overlayX,
			overlayY,
			overlayWidth,
			overlayHeight
		);
		ctx.restore();
	} else {
		// Draw error overlay instead
		const overlayHeight = overlayWidth * (4 / 3); // 4:3 aspect ratio for error box

		// Draw rounded rectangle with error styling
		ctx.save();

		// Background
		ctx.beginPath();
		ctx.moveTo(overlayX + borderRadius, overlayY);
		ctx.lineTo(overlayX + overlayWidth - borderRadius, overlayY);
		ctx.quadraticCurveTo(
			overlayX + overlayWidth,
			overlayY,
			overlayX + overlayWidth,
			overlayY + borderRadius
		);
		ctx.lineTo(
			overlayX + overlayWidth,
			overlayY + overlayHeight - borderRadius
		);
		ctx.quadraticCurveTo(
			overlayX + overlayWidth,
			overlayY + overlayHeight,
			overlayX + overlayWidth - borderRadius,
			overlayY + overlayHeight
		);
		ctx.lineTo(overlayX + borderRadius, overlayY + overlayHeight);
		ctx.quadraticCurveTo(
			overlayX,
			overlayY + overlayHeight,
			overlayX,
			overlayY + overlayHeight - borderRadius
		);
		ctx.lineTo(overlayX, overlayY + borderRadius);
		ctx.quadraticCurveTo(
			overlayX,
			overlayY,
			overlayX + borderRadius,
			overlayY
		);
		ctx.closePath();

		ctx.fillStyle = "rgba(40, 40, 40, 0.95)";
		ctx.fill();

		// Red border
		ctx.strokeStyle = "#ff6b6b";
		ctx.lineWidth = 6;
		ctx.stroke();

		// Draw error text
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "bold 40px Arial";
		ctx.fillText(
			"⚠️",
			overlayX + overlayWidth / 2,
			overlayY + overlayHeight / 2 - 20
		);
		ctx.font = "14px Arial";
		ctx.fillText(
			"Second camera",
			overlayX + overlayWidth / 2,
			overlayY + overlayHeight / 2 + 20
		);
		ctx.fillText(
			"not available",
			overlayX + overlayWidth / 2,
			overlayY + overlayHeight / 2 + 38
		);

		ctx.restore();
	}

	// Convert to blob and download
	debugLog("Converting canvas to blob...");
	canvas.toBlob((blob) => {
		if (!blob) {
			debugLog("ERROR: Failed to create blob from canvas", null, true);
			showStatus("Error: Failed to capture photo");
			return;
		}

		debugLog("Blob created", { size: blob.size, type: blob.type });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `dual-camera-${Date.now()}.png`;
		debugLog("Initiating download", { filename: a.download });
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		debugLog("Photo capture complete");
		showStatus("Photo captured!", 2000);
	}, "image/png");
}

function showStatus(message, duration = null) {
	const statusElement = document.getElementById("status");
	statusElement.textContent = message;
	statusElement.classList.add("show");

	if (duration) {
		setTimeout(() => {
			statusElement.classList.remove("show");
		}, duration);
	}
}

// Initialize debug module
initDebug();

// Click on overlay to switch cameras
document.getElementById("overlayVideo").addEventListener("click", () => {
	debugLog("Overlay video clicked");
	switchCameras();
});

// Button click handlers
document.getElementById("switchBtn").addEventListener("click", () => {
	debugLog("Switch button clicked");
	switchCameras();
});
document.getElementById("captureBtn").addEventListener("click", () => {
	debugLog("Capture button clicked");
	capturePhoto();
});

// Initialize cameras when page loads
debugLog("Page loaded, starting camera initialization");
initCameras();
