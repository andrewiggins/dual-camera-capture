# Dual Camera Capture - Architecture Documentation

This document provides a comprehensive overview of the Dual Camera Capture application architecture, designed to help developers understand, maintain, or rearchitect the application.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [High-Level Architecture](#high-level-architecture)
3. [Core Components](#core-components)
4. [UI Components](#ui-components)
5. [State Management](#state-management)
6. [Canvas Compositing](#canvas-compositing)
7. [Platform-Specific Handling](#platform-specific-handling)
8. [Edge Cases & Bug Fixes](#edge-cases--bug-fixes)
9. [Recommendations for Rearchitecting](#recommendations-for-rearchitecting)

---

## Executive Summary

### Purpose

Dual Camera Capture is a web application that captures photos from both front and back cameras simultaneously, compositing them into a single image with a picture-in-picture overlay. It's designed primarily for mobile devices with dual cameras.

### Core Functionality

- **Dual Camera Capture**: Capture both cameras and composite into one photo
- **Overlay Positioning**: Drag-to-snap overlay to any corner
- **Sequential Mode**: For iOS and optional use on other platforms
- **Photo Preview**: Review before download with share option
- **PWA Support**: Offline capability via service worker

### Target Platforms

- **Primary**: Mobile browsers (iOS Safari, Chrome for Android)
- **Secondary**: Desktop browsers with webcam

### Browser Requirements

- `getUserMedia` API for camera access
- `OffscreenCanvas` for image compositing
- `ViewTransitions` API (optional, graceful fallback)
- `Web Share` API (optional, for sharing)

---

## High-Level Architecture

### Component Relationships

```
                           ┌──────────────────────────────────────────┐
                           │              index.ts                    │
                           │         (Entry Point)                    │
                           │                                          │
                           │  1. loadSettings()                       │
                           │  2. initDebug()                          │
                           │  3. initPWA()                            │
                           │  4. registerCaptureDialog()              │
                           │  5. registerSettingsDialog()             │
                           │  6. new DualCameraApp().init()           │
                           └─────────────────┬────────────────────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                              DualCameraApp                                     │
│                         (Main Controller)                                      │
│                                                                                │
│  - Device detection (isIOS)                                                    │
│  - Camera initialization via getCameras()                                      │
│  - Mode selection (Live vs Sequential)                                         │
│  - Event listener management                                                   │
│  - Visibility change handling                                                  │
└───────────┬─────────────────────────────────────────────────────┬──────────────┘
            │                                                     │
            │ owns                                                │ owns
            ▼                                                     ▼
┌───────────────────────────┐                     ┌──────────────────────────────┐
│   VideoStreamManager      │                     │    CaptureMode               │
│                           │                     │    (Interface)               │
│  - mainCamera: Camera     │◄────────────────────│                              │
│  - overlayCamera: Camera  │    uses             │  - init()                    │
│  - overlayPosition        │                     │  - capture()                 │
│                           │                     │  - cleanup()                 │
│  - swapCameras()          │                     │  - stop()                    │
│  - pauseVideos()          │                     │  - resume()                  │
│  - playVideos()           │                     └──────────────┬───────────────┘
│  - stopAllStreams()       │                                    │
│  - resumeAllStreams()     │                     ┌──────────────┴───────────────┐
└───────────┬───────────────┘                     │                              │
            │                           ┌─────────┴─────────┐    ┌───────────────┴──────────┐
            │ manages                   │                   │    │                          │
            ▼                           │  LiveCaptureMode  │    │  SequentialCaptureMode   │
┌───────────────────────────┐           │                   │    │                          │
│       Camera              │           │  - Simultaneous   │    │  - One at a time         │
│                           │           │  - Both streams   │    │  - Two-step workflow     │
│  - deviceId               │           │    active         │    │  - Required on iOS       │
│  - facingMode             │           │  - Single capture │    │  - Stores capturedOverlay│
│  - #stream (private)      │           │    action         │    │  - Step counter (1→2→1)  │
│  - shouldFlip (getter)    │           │                   │    │                          │
│  - getStream()            │           └───────────────────┘    └──────────────────────────┘
│  - stop()                 │
└───────────────────────────┘
```

### Data Flow: Capture Sequence

```
User clicks Capture
        │
        ▼
┌───────────────────┐
│ pauseVideos()     │  ◄── Freeze frame to match what user sees
└────────┬──────────┘
         │
         ▼
┌───────────────────┐     ┌────────────────────────┐
│ drawVideoToCanvas │────►│ Main camera frame      │
│ (main camera)     │     │ with object-fit:cover  │
└───────────────────┘     │ and horizontal flip    │
                          │ if front camera        │
                          └───────────┬────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │ drawOverlayOnMainCanvas│
                          │ - Corner positioning   │
                          │ - Rounded corners      │
                          │ - Shadow effect        │
                          └───────────┬────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │ CaptureAnimation.play()│
                          │ - ViewTransition API   │
                          │ - afterframe sync      │
                          └───────────┬────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │ CaptureDialog.show()   │
                          │ - Preview canvas       │
                          │ - Deferred blob conv   │
                          │ - Download/Share       │
                          └────────────────────────┘
```

---

## Core Components

### DualCameraApp (`src/DualCameraApp.ts`)

The main application controller that orchestrates all other components.

**Responsibilities:**

- Device detection (iOS vs non-iOS)
- Camera initialization via `getCameras()`
- Capture mode selection and toggling
- Event listener setup (capture, switch, mode toggle, visibility)
- Single camera mode handling

**Key Code Patterns:**

```typescript
// iOS detection (lines 37-39)
const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Mode selection logic (lines 75-93)
if (isIOS && this.streamManager.hasDualCameras()) {
  // iOS with dual cameras → force SequentialCaptureMode
  this.currentMode = new SequentialCaptureMode(...);
} else {
  // Default to LiveCaptureMode
  this.currentMode = new LiveCaptureMode(...);

  // Show mode toggle for non-iOS with dual cameras
  if (!isIOS && this.streamManager.hasDualCameras()) {
    modeToggle.classList.add("show");
  }
}
```

**Event Handling:**

| Event              | Handler                       | Purpose                    |
| ------------------ | ----------------------------- | -------------------------- |
| `switchBtn.click`  | `streamManager.swapCameras()` | Swap main/overlay cameras  |
| `captureBtn.click` | `currentMode.capture()`       | Trigger capture workflow   |
| `modeToggle.click` | `toggleMode()`                | Switch Live ↔ Sequential   |
| `visibilitychange` | `handleVisibilityChange()`    | Pause/resume on tab switch |

---

### CaptureMode Interface (`src/DualCameraApp.ts:20-27`)

Defines the contract for capture mode implementations.

```typescript
export interface CaptureMode {
	type: string; // "LiveCaptureMode" or "SequentialCaptureMode"
	init(): Promise<void>; // Initialize mode-specific UI
	capture(): Promise<void>; // Handle capture action
	cleanup(): void; // Clean up UI (no stream work)
	stop(): Promise<void>; // Stop streams (visibility hidden)
	resume(): Promise<void>; // Resume streams (visibility visible)
}
```

---

### LiveCaptureMode (`src/LiveCaptureMode.ts`)

Simultaneous dual camera capture for non-iOS devices.

**Characteristics:**

- Both camera streams active simultaneously
- Single capture action composites both frames
- Videos pause during capture, resume on dialog close

**Capture Flow:**

```typescript
async capture(): Promise<void> {
  this.streamManager.pauseVideos();  // 1. Freeze frames

  // 2. Draw main camera
  const mainImage = drawVideoToCanvas(mainVideo.video, mainVideo.camera.shouldFlip);

  // 3. Draw overlay if available
  if (overlayVideo) {
    const overlayImage = drawVideoToCanvas(...);
    drawOverlayOnMainCanvas(mainImage, overlayImage, ...);
  }

  // 4. Animate to dialog
  await this.animation.play(mainImage, "dialog-image", () => {
    this.captureDialog.show(mainImage);
  });

  // Videos remain paused until "retake" event
}
```

---

### SequentialCaptureMode (`src/SequentialCaptureMode.ts`)

One-camera-at-a-time capture, required for iOS and optional elsewhere.

**Characteristics:**

- Only one stream active at a time
- Two-step capture workflow
- Stores captured overlay between steps
- Automatically swaps cameras after first capture

**State:**

```typescript
private capturedOverlay: OffscreenCanvas | null = null;
private step = 0;  // 0 = single camera, 1 = capturing overlay, 2 = capturing main
```

**Two-Step Workflow:**

```
Step 1: Capture Overlay
┌────────────────────────────────────────────────────┐
│ 1. User sees front camera full screen              │
│ 2. Clicks "Capture Overlay"                        │
│ 3. Frame saved to capturedOverlay                  │
│ 4. Preview animates to corner preview canvas       │
│ 5. Camera automatically swaps to back camera       │
│ 6. Button changes to "Capture & Download"          │
└────────────────────────────────────────────────────┘
                        │
                        ▼
Step 2: Capture Main
┌────────────────────────────────────────────────────┐
│ 1. User sees back camera full screen               │
│ 2. Clicks "Capture & Download"                     │
│ 3. Frame captured, overlay composited              │
│ 4. Result animates to CaptureDialog                │
│ 5. Reset: clear preview, swap back, step = 1       │
└────────────────────────────────────────────────────┘
```

---

### VideoStreamManager (`src/VideoStreamManager.ts`)

Centralizes stream lifecycle management.

**Responsibilities:**

- Bind camera streams to video elements
- Handle camera swap with iOS-specific logic
- Apply front camera orientation (horizontal flip)
- Calculate overlay dimensions to match viewport aspect ratio
- Manage overlay position (drag-to-snap)

**Key Methods:**

| Method                            | Purpose                                  |
| --------------------------------- | ---------------------------------------- |
| `swapCameras()`                   | Swap main and overlay camera assignments |
| `pauseVideos()`                   | Pause both video elements                |
| `playVideos()`                    | Resume both video elements               |
| `stopAllStreams()`                | Stop all camera tracks, clear srcObject  |
| `resumeAllStreams()`              | Re-request streams, update orientations  |
| `showOverlay()` / `hideOverlay()` | Toggle overlay visibility                |
| `getMainCameraVideo()`            | Get main camera and video element        |
| `getOverlayCameraVideo()`         | Get overlay camera and video element     |
| `hasDualCameras()`                | Check if second camera available         |
| `getOverlayCorner()`              | Get current overlay corner position      |

**Camera Swap Logic:**

```typescript
async swapCameras(): Promise<void> {
  // Swap references
  const temp = this.mainCamera;
  this.mainCamera = this.overlayCamera;
  this.overlayCamera = temp;

  if (this.isIOS) {
    // iOS: Stop old stream, start new (only one at a time)
    this.overlayCamera.stop();
    mainVideoEl.srcObject = await this.mainCamera.getStream();
    overlayVideoEl.srcObject = null;
  } else {
    // Desktop: Just swap srcObject references
    mainVideoEl.srcObject = await this.mainCamera.getStream();
    overlayVideoEl.srcObject = await this.overlayCamera.getStream();
  }

  this.updateOrientation();
}
```

---

### Camera Class (`src/getCameras.ts`)

Wraps MediaStream with metadata and lifecycle management.

**Properties:**

| Property     | Type                                   | Description                                  |
| ------------ | -------------------------------------- | -------------------------------------------- |
| `deviceId`   | `string`                               | Unique camera identifier                     |
| `facingMode` | `"environment" \| "user" \| undefined` | Camera direction                             |
| `#stream`    | `MediaStream \| null`                  | Private stream reference                     |
| `shouldFlip` | `boolean` (getter)                     | True if front camera (needs horizontal flip) |

**Key Methods:**

```typescript
// Lazy stream loading with caching
async getStream(): Promise<MediaStream> {
  if (this.#stream) return this.#stream;
  this.#stream = await getVideoStream({ deviceId: this.deviceId });
  return this.#stream;
}

// Stop all tracks and clear reference (allows re-request)
stop(): void {
  if (this.#stream) {
    this.#stream.getTracks().forEach(track => track.stop());
    this.#stream = null;
  }
}
```

---

### getCameras() Function (`src/getCameras.ts:89-163`)

Two-phase camera detection strategy.

**Phase 1: FacingMode Detection**

```typescript
// Try to get environment (back) camera
const envCamera = await getVideoStream({ facingMode: "environment" });

// Try to get user (front) camera
const userCamera = await getVideoStream({ facingMode: "user" });

// iOS: Stop immediately to prevent stream collision
if (isIOS) {
	envCamera.stop();
	userCamera.stop();
}
```

**Phase 2: DeviceId Fallback**

```typescript
// If fewer than 2 cameras, try by deviceId
const allDevices = await navigator.mediaDevices.enumerateDevices();
for (const device of allDevices) {
	if (!usedDeviceIds.includes(device.deviceId)) {
		const camera = await getVideoStream({ deviceId: device.deviceId });
		// No facingMode info available via deviceId
	}
}
```

---

## UI Components

### CaptureDialog (`src/CaptureDialog.ts`)

Custom element for photo preview with download/share options.

**Key Features:**

- Deferred blob conversion (non-blocking dialog open)
- Promise caching (convert once, reuse for share/download)
- Resource cleanup (revoke blob URLs)
- Web Share API integration

**State:**

```typescript
private sourceCanvas: OffscreenCanvas | null = null;  // Original capture
private blobPromise: Promise<Blob> | null = null;     // Cached conversion
private blobUrl: string | null = null;                // For download link
```

**Show Flow:**

```typescript
show(source: OffscreenCanvas): void {
  this.cleanup();
  this.sourceCanvas = source;

  // Draw to visible canvas for immediate preview
  this.canvas.width = source.width;
  this.canvas.height = source.height;
  ctx.drawImage(source, 0, 0);

  this.dialog.showModal();

  // Defer blob conversion to next task (non-blocking)
  setTimeout(() => this.prepareDownload(), 0);
}
```

**Events Emitted:**

- `retake`: Dispatched when dialog closes (triggers video resume)

---

### CaptureAnimation (`src/CaptureAnimation.ts`)

Handles capture animation using ViewTransitions API.

**Key Concepts:**

1. **Paint Synchronization**: Uses `afterframe` library to ensure canvas is rendered before transition starts
2. **ViewTransition Names**: Source and destination elements share the same `view-transition-name`
3. **Graceful Fallback**: Immediately shows destination if ViewTransitions unsupported

**Animation Flow:**

```typescript
async play(sourceCanvas, transitionName, showDestination): Promise<void> {
  // Check support
  if (!document.startViewTransition) {
    showDestination();
    return;
  }

  // 1. Draw OffscreenCanvas to visible canvas
  this.canvasElement.width = sourceCanvas.width;
  this.canvasElement.height = sourceCanvas.height;
  ctx.drawImage(sourceCanvas, 0, 0);

  // 2. Set transition name and show
  this.canvasElement.style.viewTransitionName = transitionName;
  this.canvasElement.classList.add("active");

  // 3. Wait for paint (CRITICAL!)
  await afterFrameAsync();

  // 4. Start transition
  const transition = document.startViewTransition(() => {
    this.canvasElement.classList.remove("active");
    showDestination();
  });

  await transition.finished;

  // 5. Cleanup
  this.canvasElement.style.viewTransitionName = "";
  ctx.clearRect(...);
}
```

---

### OverlayPosition (`src/OverlayPosition.ts`)

Manages overlay drag-to-snap functionality.

**State:**

```typescript
private currentCorner: Corner = "top-left";
private isDragging = false;
private hasMoved = false;  // Distinguishes tap from drag
private dragStartX/Y = 0;
private elementStartX/Y = 0;
private readonly DRAG_THRESHOLD = 10;  // px
```

**Behavior:**

| Action  | Detection        | Result                                |
| ------- | ---------------- | ------------------------------------- |
| Tap     | Movement < 10px  | Call `onTap()` callback (camera swap) |
| Drag    | Movement >= 10px | Free positioning during drag          |
| Release | After drag       | Snap to nearest corner                |

**Snap Logic:**

```typescript
private findNearestCorner(x: number, y: number): Corner {
  const isLeft = x < window.innerWidth / 2;
  const isTop = y < window.innerHeight / 2;

  if (isTop && isLeft) return "top-left";
  if (isTop && !isLeft) return "top-right";
  if (!isTop && isLeft) return "bottom-left";
  return "bottom-right";
}
```

**CSS Classes:**

- `overlay-corner-{corner}`: Applied when snapped (CSS handles positioning)
- `overlay-dragging`: Applied during drag (disables transitions)

---

## State Management

### State Location Summary

| State                    | Location              | Lifetime            | Purpose                     |
| ------------------------ | --------------------- | ------------------- | --------------------------- |
| `settings.debug`         | Memory + localStorage | Persistent          | Debug mode toggle           |
| `currentMode`            | DualCameraApp         | Session             | Active capture mode         |
| `mainCamera`             | VideoStreamManager    | Session             | Primary camera reference    |
| `overlayCamera`          | VideoStreamManager    | Session             | Secondary camera reference  |
| `currentCorner`          | OverlayPosition       | Session             | Overlay snap position       |
| `capturedOverlay`        | SequentialCaptureMode | Capture cycle       | First photo in sequence     |
| `step`                   | SequentialCaptureMode | Capture cycle       | Sequential progress (1→2→1) |
| `isDragging`, `hasMoved` | OverlayPosition       | Pointer interaction | Drag state                  |
| `blobUrl`                | CaptureDialog         | Dialog open         | Download link               |

### State Flow Patterns

**1. Settings (Global Singleton)**

```typescript
// src/settings.ts
export const settings: Settings = { debug: false };

// Load at startup
loadSettings(); // Reads from localStorage

// Update anywhere
updateSetting("debug", true); // Writes to localStorage immediately
```

**2. Camera Assignment (VideoStreamManager)**

```typescript
// Cameras assigned at startup, swapped on user action
this.mainCamera = cameras[0];
this.overlayCamera = cameras[1];

// Swap modifies internal state only
async swapCameras() {
  [this.mainCamera, this.overlayCamera] = [this.overlayCamera, this.mainCamera];
  // Then update video element bindings
}
```

**3. Event-Driven Communication**

```typescript
// CaptureDialog emits "retake" when closed
this.captureDialog.addEventListener("retake", () => {
	this.streamManager.playVideos(); // Resume after dialog
});

// SettingsDialog emits "settings-changed"
this.dispatchEvent(
	new CustomEvent("settings-changed", {
		detail: { key: "debug", value: true },
	}),
);
```

---

## Canvas Compositing

### drawVideoToCanvas() (`src/canvas.ts:39-81`)

Captures video frame with object-fit: cover behavior.

**Key Operations:**

1. **Calculate Crop Region**: Match viewport aspect ratio
2. **Apply Quality Scaling**: Use larger of viewport or source dimensions
3. **Apply Horizontal Flip**: For front cameras (shouldFlip = true)

```typescript
export function drawVideoToCanvas(video, flipHorizontal = false): OffscreenCanvas {
  // Get dimensions
  const viewportWidth = video.clientWidth;
  const viewportHeight = video.clientHeight;
  const srcWidth = video.videoWidth;
  const srcHeight = video.videoHeight;

  // Quality scaling
  const scale = Math.max(srcWidth / viewportWidth, srcHeight / viewportHeight, 1);
  const width = Math.round(viewportWidth * scale);
  const height = Math.round(viewportHeight * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;

  // Calculate crop for object-fit: cover
  const { sx, sy, sw, sh } = calculateCoverCrop(...);

  ctx.save();
  if (flipHorizontal) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  return canvas;
}
```

---

### drawOverlayOnMainCanvas() (`src/canvas.ts:113-188`)

Composites overlay with proper styling.

**Key Operations:**

1. **Scale Factor Calculation**: `canvas.width / viewportWidth`
2. **Corner Positioning**: Based on selected corner
3. **Shadow Rendering**: Matches CSS `box-shadow`
4. **Rounded Corners**: Via `quadraticCurveTo`

```typescript
export function drawOverlayOnMainCanvas(mainImage, overlayImage, viewportWidth, corner): void {
  // Scale factor for CSS → Canvas coordinate conversion
  const scale = mainImage.width / viewportWidth;

  const overlayWidth = mainImage.width * 0.25;
  const overlayHeight = (mainImage.height / mainImage.width) * overlayWidth;
  const margin = 20 * scale;           // matches CSS
  const bottomMargin = 100 * scale;    // matches CSS for bottom corners
  const borderRadius = 16 * scale;     // matches CSS

  // Calculate position based on corner
  let overlayX, overlayY;
  switch (corner) {
    case "top-left":
      overlayX = margin;
      overlayY = margin;
      break;
    // ... other corners
  }

  // Draw shadow (matches CSS: 0 8px 32px rgba(0, 0, 0, 0.6))
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 32 * scale;
  ctx.shadowOffsetY = 8 * scale;
  roundedRectPath(ctx, overlayX, overlayY, overlayWidth, overlayHeight, borderRadius);
  ctx.fill();

  // Clip and draw image with rounded corners
  ctx.save();
  roundedRectPath(...);
  ctx.clip();
  ctx.drawImage(overlayImage, overlayX, overlayY, overlayWidth, overlayHeight);
  ctx.restore();
}
```

**CRITICAL**: All positioning values must be scaled by `canvas.width / viewportWidth` to match CSS preview.

---

## Platform-Specific Handling

### iOS Limitations

**WebKit Bug**: iOS Safari cannot run two camera streams simultaneously.

References:

- https://bugs.webkit.org/show_bug.cgi?id=179363
- https://bugs.webkit.org/show_bug.cgi?id=238492

**Handling Throughout Codebase:**

| Location                                | iOS-Specific Behavior                    |
| --------------------------------------- | ---------------------------------------- |
| `getCameras()`                          | Stop cameras immediately after discovery |
| `DualCameraApp.init()`                  | Force SequentialCaptureMode              |
| `VideoStreamManager.swapCameras()`      | Stop old stream before starting new      |
| `VideoStreamManager.resumeAllStreams()` | Don't start overlay stream               |

**iOS Detection:**

```typescript
const isIOS =
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
```

The second condition catches iPad in "Request Desktop Website" mode.

---

### Mobile Viewport Handling

**Dynamic Viewport Height:**

```css
height: 100dvh; /* Accounts for browser chrome that slides in/out */
```

**Safe Area Insets:**

```css
/* Ensure buttons stay visible above system UI */
padding-bottom: max(20px, env(safe-area-inset-bottom));
```

**Meta Tag:**

```html
<meta
	name="viewport"
	content="width=device-width, initial-scale=1, viewport-fit=cover"
/>
```

The `viewport-fit=cover` enables `env(safe-area-inset-*)` values.

---

### Front Camera Orientation

**Problem**: Front cameras appear inverted without horizontal flip.

**Solution**:

1. `Camera.shouldFlip` returns `true` for front cameras
2. CSS class `.front-camera` applies `transform: scaleX(-1)`
3. Canvas drawing applies horizontal flip via context transform

```typescript
// VideoStreamManager.updateOrientation()
if (this.mainCamera.shouldFlip) {
	mainVideoEl.classList.add("front-camera");
}

// drawVideoToCanvas()
if (flipHorizontal) {
	ctx.translate(canvas.width, 0);
	ctx.scale(-1, 1);
}
```

---

## Edge Cases & Bug Fixes

This section documents bugs discovered during development and their solutions. Understanding these is critical for rearchitecting.

### 1. iOS Camera Collision

**Problem**: On iOS, initializing multiple camera streams causes them to interfere with each other.

**Solution**: Stop cameras immediately after discovery, only activate on-demand.

```typescript
// getCameras()
if (isIOS) {
	envCamera.stop();
	userCamera.stop();
}
```

**Lesson**: iOS requires careful stream lifecycle management. Never have two streams simultaneously.

---

### 2. Front Camera Orientation on Initial Render

**Problem**: Front cameras weren't flipped on initial render, appearing inverted.

**Solution**: Call `updateOrientation()` in VideoStreamManager constructor before streams become visible.

```typescript
constructor(...) {
  // ... camera setup ...
  this.updateOrientation();  // Apply flip classes immediately
}
```

**Lesson**: Orientation must be set before first paint, not after metadata loads.

---

### 3. Touch Pointer Dragging Not Working

**Problem**: Overlay dragging didn't work with touch input due to browser default behaviors.

**Solution**: Disable default touch actions on draggable elements.

```typescript
el.style.touchAction = "none";
```

**Lesson**: Custom pointer event handling requires explicitly disabling browser defaults.

---

### 4. Captured Frame Doesn't Match Display

**Problem**: The captured frame differed from what the user saw because video continued playing between button press and canvas draw.

**Solution**: Pause videos before capturing.

```typescript
async capture(): Promise<void> {
  this.streamManager.pauseVideos();  // Freeze frame FIRST
  await this.doCapture();
}
```

**Lesson**: Video must be paused before drawing to ensure captured frame matches user expectation.

---

### 5. CaptureDialog Layout Shift

**Problem**: Dialog content shifted when image loaded because browser didn't know dimensions.

**Solution**: Set canvas dimensions before drawing.

```typescript
this.canvas.width = source.width;
this.canvas.height = source.height;
// Now browser knows size before image renders
ctx.drawImage(source, 0, 0);
```

**Lesson**: Always provide sizing information before loading dynamic content.

---

### 6. Video Playback During Dialog

**Problem**: Videos continued playing while capture dialog was open, wasting resources and showing "live" content during review.

**Solution**: Keep videos paused until dialog closes (retake event).

```typescript
// Capture pauses videos
this.streamManager.pauseVideos();

// Dialog close resumes
this.captureDialog.addEventListener("retake", () => {
	this.streamManager.playVideos();
});
```

**Lesson**: Capture workflow must manage pause/resume states across the entire preview cycle.

---

### 7. ViewTransition Rendering Timing

**Problem**: ViewTransitions animation started before source element was painted, causing broken animation.

**Solution**: Use `afterframe` library to wait for paint before starting transition.

```typescript
import afterframe from "afterframe";

// Draw canvas
ctx.drawImage(sourceCanvas, 0, 0);
this.canvasElement.classList.add("active");

// CRITICAL: Wait for paint
await afterFrameAsync();

// NOW start transition
document.startViewTransition(() => { ... });
```

**Lesson**: ViewTransitions API requires source element to be visually rendered first.

---

### 8. Sequential Mode Camera Swap Timing

**Problem**: In sequential mode, camera swap happened after view transition, breaking visual flow.

**Solution**: Move camera swap inside the transition callback.

```typescript
await this.animation.play(overlay, "overlay-preview", async () => {
	// Show preview AND swap camera together
	previewCanvas.getContext("2d")!.drawImage(overlay, 0, 0);
	await this.streamManager.swapCameras(); // Inside callback
});
```

**Lesson**: Multi-step animations need careful choreography of state changes.

---

### 9. Blob Conversion Blocking Dialog

**Problem**: Converting OffscreenCanvas to Blob blocked main thread, delaying dialog open animation.

**Solution**: Draw canvas directly for preview, defer blob conversion to background.

```typescript
show(source: OffscreenCanvas): void {
  // Immediate: Draw canvas for preview
  ctx.drawImage(source, 0, 0);
  this.dialog.showModal();

  // Deferred: Blob conversion in next task
  setTimeout(() => this.prepareDownload(), 0);
}
```

**Lesson**: Separate immediate visual feedback from expensive async operations.

---

### 10. Blob Quality vs File Size

**Problem**: PNG with 100% quality created large, slow-to-convert blobs.

**Solution**: Use JPEG at 75% quality.

```typescript
canvas.convertToBlob({
	type: "image/jpeg",
	quality: 0.75,
});
```

**Lesson**: JPEG is appropriate for camera photos; PNG overhead isn't justified.

---

### 11. ImageBitmap Memory Leak

**Problem**: Intermediate ImageBitmaps from downscaling weren't being cleaned up, causing GPU memory leaks.

**Solution**: Close all ImageBitmaps in finally block.

```typescript
let bitmap: ImageBitmap | null = null;
try {
	bitmap = await createImageBitmap(source);
	// ... use bitmap ...
} finally {
	if (bitmap) bitmap.close();
}
```

**Lesson**: GPU resources (ImageBitmap, OffscreenCanvas) need explicit cleanup.

---

### 12. Single Camera Error Overlay in Capture

**Problem**: When only one camera was available, error placeholder rendered in captured image.

**Solution**: Check for second camera before drawing overlay.

```typescript
const overlayVideo = this.streamManager.getOverlayCameraVideo();
if (overlayVideo) {  // Only if available
  drawOverlayOnMainCanvas(...);
}
```

**Lesson**: Graceful degradation shouldn't pollute output with error states.

---

### 13. Canvas Overlay Positioning/Sizing

**Problem**: Fixed pixel values (20px margin, 16px radius) didn't scale with canvas upscaling.

**Solution**: Calculate scale factor from viewport to canvas and apply to all values.

```typescript
const scale = mainImage.width / viewportWidth;
const margin = 20 * scale;
const borderRadius = 16 * scale;
const shadowBlur = 32 * scale;
```

**Lesson**: Canvas coordinates don't automatically scale with CSS. Manual scaling required.

---

### 14. Canvas vs CSS Styling Mismatch

**Problem**: Captured overlay didn't match CSS preview (different shadows, borders).

**Solution**: Manually draw shadow using canvas shadow properties.

```typescript
ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
ctx.shadowBlur = 32 * scale;
ctx.shadowOffsetY = 8 * scale;
// Draw shape to cast shadow
roundedRectPath(ctx, ...);
ctx.fill();
```

**Lesson**: Canvas and CSS use different rendering primitives. Match manually.

---

## Recommendations for Rearchitecting

### Critical Design Principles

1. **Centralize Stream Lifecycle**: VideoStreamManager pattern is essential. Never manage streams directly in capture modes.

2. **iOS Must Be First-Class**: Don't treat iOS as an edge case. Design for sequential mode first, then optimize for simultaneous.

3. **Paint Synchronization for Animations**: Any ViewTransitions usage must wait for paint. Use `afterframe` or similar.

4. **Canvas Must Match CSS**: Overlay positioning, shadows, and rounded corners must be manually implemented to match CSS preview.

5. **Resource Cleanup Is Mandatory**: ImageBitmap, blob URLs, and canvas contexts need explicit cleanup.

6. **Pause Before Capture**: Video elements must be paused before drawing to canvas.

### State Management Recommendations

1. Keep camera state centralized (VideoStreamManager pattern)
2. Use events for cross-component communication
3. Settings should be a simple singleton with localStorage backing
4. Capture mode instances can hold capture-specific state (sequential step, overlay)

### Testing Requirements

1. **Device Testing**: Must test on actual iOS and Android devices
2. **Camera Testing**: Need device with front + back cameras
3. **Orientation Testing**: Test both portrait and landscape
4. **Single Camera Testing**: Test degraded mode with webcam

### Potential Improvements

1. **Stream Pooling**: Pre-warm the second camera stream for faster swaps
2. **Worker-Based Compositing**: Move canvas operations to Web Worker
3. **Compressed Texture**: Use WebGL for faster image processing
4. **Streaming Capture**: Use MediaRecorder for video capture capability
