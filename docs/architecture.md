# Dual Camera Capture - Architecture Documentation

This document provides a comprehensive overview of the Dual Camera Capture application architecture, designed to help developers understand, maintain, or extend the application.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Architecture](#component-architecture)
4. [State Management](#state-management)
5. [Hooks](#hooks)
6. [Canvas Compositing](#canvas-compositing)
7. [Platform-Specific Handling](#platform-specific-handling)
8. [Edge Cases & Bug Fixes](#edge-cases--bug-fixes)
9. [Key Implementation Patterns](#key-implementation-patterns)

---

## Executive Summary

### Purpose

Dual Camera Capture is a web application that captures photos from both front and back cameras simultaneously, compositing them into a single image with a picture-in-picture overlay. It's designed primarily for mobile devices with dual cameras.

### Technology Stack

- **UI Framework**: Preact (lightweight React alternative)
- **State Management**: @preact/signals (fine-grained reactivity)
- **Build Tool**: Vite with @preact/preset-vite
- **Language**: TypeScript with JSX

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

### Component Tree

```
<App>
  <CameraProvider>              # Context for stream management + refs
    <MainLayout>
      <MainVideo />             # Full-screen main camera
      <OverlayVideo />          # PiP overlay (includes OverlayError)
      <SequentialPreview />     # Sequential mode captured overlay
      <SequentialInstructions />
      <CaptureFlash />          # Flash animation element
      <CaptureAnimatedCanvas /> # ViewTransition animation target
      <StatusMessage />
      <Controls>
        <ModeToggleButton />
        <CaptureButton />
        <SwitchButton />
      </Controls>
      <SettingsButton />
    </MainLayout>
    <CaptureDialog />           # Native dialog (top layer)
    <SettingsDialog />          # Native dialog (top layer)
    <DebugPanel />
  </CameraProvider>
</App>
```

### Data Flow Overview

```
                    Signals (Global State)
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────┐ ┌──────────────────┐
│ cameraSignals   │ │ uiSignals   │ │ Component State  │
│                 │ │             │ │                  │
│ - mainCamera    │ │ - dialog    │ │ - refs (video    │
│ - overlayCamera │ │   open      │ │   elements)      │
│ - currentMode   │ │ - captured  │ │ - local UI state │
│ - overlayCorner │ │   Image     │ │                  │
│ - sequentialStep│ │ - status    │ │                  │
└─────────────────┘ └─────────────┘ └──────────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ▼
                    Component Renders
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
                          │ playCaptureAnimation() │
                          │ - ViewTransition API   │
                          │ - afterframe sync      │
                          └───────────┬────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │ CaptureDialog opens    │
                          │ - capturedImage signal │
                          │ - Deferred blob conv   │
                          │ - Download/Share       │
                          └────────────────────────┘
```

---

## Component Architecture

### CameraProvider (`src/components/CameraProvider.tsx`)

The central context provider that manages camera streams and video element refs.

**Provides via Context:**

| Value                        | Type                       | Description                        |
| ---------------------------- | -------------------------- | ---------------------------------- |
| `mainVideoRef`               | `MutableRef<HTMLVideoElement>` | Main video element ref         |
| `overlayVideoRef`            | `MutableRef<HTMLVideoElement>` | Overlay video element ref      |
| `sequentialPreviewCanvasRef` | `MutableRef<HTMLCanvasElement>` | Sequential preview canvas ref |
| `captureAnimatedCanvasRef`   | `MutableRef<HTMLCanvasElement>` | Animation canvas ref          |
| `swapCameras()`              | `() => Promise<void>`      | Swap main/overlay cameras          |
| `pauseVideos()`              | `() => void`               | Pause both video elements          |
| `playVideos()`               | `() => void`               | Resume both video elements         |
| `stopAllStreams()`           | `() => Promise<void>`      | Stop all camera tracks             |
| `resumeAllStreams()`         | `() => Promise<void>`      | Re-request streams                 |
| `getMainCameraVideo()`       | `() => {camera, video}`    | Get main camera and video          |
| `getOverlayCameraVideo()`    | `() => {camera, video}`    | Get overlay camera and video       |

**Responsibilities:**

- Initialize cameras on mount via `getCameras()`
- Detect iOS and force sequential mode if needed
- Handle iOS-specific stream lifecycle (stop old before start new)
- Manage `visibilitychange` event for pause/resume
- Update video orientation classes (`.front-camera`)
- Calculate overlay dimensions to match viewport aspect ratio

**Key Code Pattern - iOS Camera Swap:**

```typescript
if (isIOSSignal.value) {
  // iOS: stop old, start new (only one stream at a time)
  main?.stop();
  mainEl.srcObject = overlay ? await overlay.getStream() : null;
  overlayEl.srcObject = null;
} else {
  // Desktop: just swap srcObject references
  mainEl.srcObject = overlay ? await overlay.getStream() : null;
  overlayEl.srcObject = main ? await main.getStream() : null;
}
```

---

### CaptureDialog (`src/components/CaptureDialog.tsx`)

Photo preview dialog using native `<dialog>` element (renders in browser's top layer).

**Key Features:**

- Deferred blob conversion (non-blocking dialog open)
- Promise caching (convert once, reuse for share/download)
- Resource cleanup (revoke blob URLs)
- Web Share API integration

**State:**

```typescript
const blobPromiseRef = useRef<Promise<Blob> | null>(null);  // Cached conversion
const blobUrlRef = useRef<string | null>(null);              // For download link
```

**Show Flow:**

```typescript
// In useEffect when captureDialogOpen.value && capturedImage.value
canvas.width = source.width;
canvas.height = source.height;
ctx.drawImage(source, 0, 0);  // Immediate preview

dialog.showModal();

// Deferred: Blob conversion in next task (non-blocking)
setTimeout(() => prepareDownload(), 0);
```

---

### SettingsDialog (`src/components/SettingsDialog.tsx`)

Settings dialog with debug mode toggle and PWA update button.

**Features:**

- Debug mode toggle (persists to localStorage)
- "View Debug Logs" button (visible when debug enabled)
- "Reload to Update" button (visible when PWA update available)

---

### Video Components

**MainVideo** (`src/components/MainVideo.tsx`): Thin wrapper that renders the main `<video>` element with ref from context.

**OverlayVideo** (`src/components/OverlayVideo.tsx`): Renders overlay video with drag-to-snap functionality via `useOverlayPosition` hook. Also renders `OverlayError` component for single-camera mode.

**SequentialPreview** (`src/components/SequentialPreview.tsx`): Shows captured overlay preview in sequential mode with drag-to-snap functionality.

---

### Control Components

**CaptureButton** (`src/components/CaptureButton.tsx`): Triggers capture via appropriate hook based on `currentMode` signal.

**ModeToggleButton** (`src/components/ModeToggleButton.tsx`): Toggles between live and sequential modes. Only visible on non-iOS with dual cameras.

**SwitchButton** (`src/components/SwitchButton.tsx`): Swaps main and overlay cameras. Disabled in single-camera mode.

**SettingsButton** (`src/components/SettingsButton.tsx`): Opens settings dialog.

---

## State Management

### Signal Organization

State is managed using `@preact/signals` for fine-grained reactivity without unnecessary re-renders.

#### Camera Signals (`src/state/cameraSignals.ts`)

```typescript
// Core camera state
export const mainCamera = signal<Camera | null>(null);
export const overlayCamera = signal<Camera | null>(null);
export const isIOS = signal(false);
export const cameraInitState = signal<"pending" | "ready" | "error">("pending");
export const hasDualCameras = computed(() => overlayCamera.value !== null);

// Capture mode
export const currentMode = signal<"live" | "sequential">("live");
export const sequentialStep = signal<0 | 1 | 2>(0);
export const capturedOverlay = signal<OffscreenCanvas | null>(null);

// Overlay position (updated only on snap, not during drag)
export const overlayCorner = signal<Corner>("top-left");
```

#### UI Signals (`src/state/uiSignals.ts`)

```typescript
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
```

### State Location Summary

| State              | Location           | Lifetime            | Purpose                     |
| ------------------ | ------------------ | ------------------- | --------------------------- |
| `mainCamera`       | cameraSignals      | Session             | Primary camera reference    |
| `overlayCamera`    | cameraSignals      | Session             | Secondary camera reference  |
| `currentMode`      | cameraSignals      | Session             | Active capture mode         |
| `overlayCorner`    | cameraSignals      | Session             | Overlay snap position       |
| `sequentialStep`   | cameraSignals      | Capture cycle       | Sequential progress (1→2→1) |
| `capturedOverlay`  | cameraSignals      | Capture cycle       | First photo in sequence     |
| `captureDialogOpen`| uiSignals          | Dialog open         | Dialog visibility           |
| `capturedImage`    | uiSignals          | Dialog open         | Photo to preview            |
| `statusMessage`    | uiSignals          | Temporary           | Status toast message        |
| `debugMode`        | uiSignals + localStorage | Persistent   | Debug mode toggle           |
| Video refs         | CameraProvider     | Session             | DOM element references      |
| Drag state         | useOverlayPosition | Pointer interaction | Local to hook (refs)        |

### Why Signals?

1. **Fine-grained reactivity**: Only components that read a signal re-render when it changes
2. **No prop drilling**: Signals can be imported directly where needed
3. **Performance during drag**: Overlay position uses refs during drag, signal only on snap completion
4. **Cross-component state**: Dialog open state, captured image shared without context

---

## Hooks

### useLiveCaptureMode (`src/hooks/useLiveCaptureMode.ts`)

Simultaneous dual camera capture for non-iOS devices.

**Returns:** `{ capture: () => Promise<void> }`

**Capture Flow:**

```typescript
const capture = useCallback(async () => {
  ctx.pauseVideos();

  // Draw main camera
  const mainImage = drawVideoToCanvas(mainVideo.video, mainVideo.camera.shouldFlip);

  // Draw overlay if available
  if (overlayVideo) {
    const overlayImage = drawVideoToCanvas(...);
    drawOverlayOnMainCanvas(mainImage, overlayImage, ...);
  }

  // Animate to dialog
  await playCaptureAnimation(mainImage, "dialog-image", canvasRef, () => {
    capturedImage.value = mainImage;
    captureDialogOpen.value = true;
  });

  // Videos remain paused until dialog closes
}, [ctx]);
```

---

### useSequentialCaptureMode (`src/hooks/useSequentialCaptureMode.ts`)

One-camera-at-a-time capture, required for iOS.

**Returns:** `{ capture: () => Promise<void> }`

**State Machine:**

```
step = 0: Single camera mode (no dual cameras)
step = 1: Capturing overlay (first photo)
step = 2: Capturing main (second photo)
```

**Two-Step Workflow:**

```
Step 1: Capture Overlay
┌────────────────────────────────────────────────────┐
│ 1. User sees camera full screen                    │
│ 2. Clicks "Capture Overlay"                        │
│ 3. Frame saved to capturedOverlay signal           │
│ 4. Preview animates to corner preview canvas       │
│ 5. Camera automatically swaps                      │
│ 6. sequentialStep → 2                              │
└────────────────────────────────────────────────────┘
                        │
                        ▼
Step 2: Capture Main
┌────────────────────────────────────────────────────┐
│ 1. User sees other camera full screen              │
│ 2. Clicks "Capture & Download"                     │
│ 3. Frame captured, overlay composited              │
│ 4. Result animates to CaptureDialog                │
│ 5. Reset: clear preview, swap back, step → 1      │
└────────────────────────────────────────────────────┘
```

---

### useOverlayPosition (`src/hooks/useOverlayPosition.ts`)

Manages overlay drag-to-snap functionality.

**Returns:** `{ overlayRef: MutableRef<T | null> }`

**Key Design Decisions:**

1. **Uses refs during drag**: No state updates while dragging to avoid re-renders
2. **Signal update only on snap**: `overlayCorner` signal updated after 250ms transition
3. **Tap detection**: Movement < 10px triggers `onTap` callback (camera swap)

**State (all refs to avoid re-renders):**

```typescript
const isDraggingRef = useRef(false);
const hasMovedRef = useRef(false);  // Distinguishes tap from drag
const dragStartXRef = useRef(0);
const dragStartYRef = useRef(0);
const elementStartXRef = useRef(0);
const elementStartYRef = useRef(0);
```

**Snap Logic:**

```typescript
const findNearestCorner = (x: number, y: number): Corner => {
  const isLeft = x < window.innerWidth / 2;
  const isTop = y < window.innerHeight / 2;

  if (isTop && isLeft) return "top-left";
  if (isTop && !isLeft) return "top-right";
  if (!isTop && isLeft) return "bottom-left";
  return "bottom-right";
};
```

**CSS Classes Applied:**

- `overlay-corner-{corner}`: Applied when snapped (CSS handles positioning)
- `overlay-dragging`: Applied during drag (disables transitions)

---

## Canvas Compositing

### drawVideoToCanvas() (`src/canvas.ts`)

Captures video frame with object-fit: cover behavior.

**Key Operations:**

1. **Calculate Crop Region**: Match viewport aspect ratio
2. **Apply Quality Scaling**: Use larger of viewport or source dimensions
3. **Apply Horizontal Flip**: For front cameras (shouldFlip = true)

```typescript
export function drawVideoToCanvas(video, flipHorizontal = false): OffscreenCanvas {
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

### drawOverlayOnMainCanvas() (`src/canvas.ts`)

Composites overlay with proper styling.

**Key Operations:**

1. **Scale Factor Calculation**: `canvas.width / viewportWidth`
2. **Corner Positioning**: Based on selected corner
3. **Shadow Rendering**: Matches CSS `box-shadow`
4. **Rounded Corners**: Via `quadraticCurveTo`

```typescript
export function drawOverlayOnMainCanvas(mainImage, overlayImage, viewportWidth, corner): void {
  const scale = mainImage.width / viewportWidth;

  const overlayWidth = mainImage.width * 0.25;
  const overlayHeight = (mainImage.height / mainImage.width) * overlayWidth;
  const margin = 20 * scale;           // matches CSS
  const bottomMargin = 100 * scale;    // matches CSS
  const borderRadius = 16 * scale;     // matches CSS

  // Position based on corner
  let overlayX, overlayY;
  switch (corner) { /* ... */ }

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

### playCaptureAnimation() (`src/CaptureAnimation.ts`)

Animates capture using ViewTransitions API.

**Key Concepts:**

1. **Paint Synchronization**: Uses `afterframe` library to ensure canvas is rendered before transition
2. **ViewTransition Names**: Source and destination elements share the same `view-transition-name`
3. **Graceful Fallback**: Immediately shows destination if ViewTransitions unsupported

```typescript
export async function playCaptureAnimation(
  sourceCanvas: OffscreenCanvas,
  transitionName: string,
  canvasElement: HTMLCanvasElement | null,
  showDestination: () => void,
): Promise<void> {
  if (!document.startViewTransition || !canvasElement) {
    showDestination();
    return;
  }

  // Draw OffscreenCanvas to visible canvas
  canvasElement.width = sourceCanvas.width;
  canvasElement.height = sourceCanvas.height;
  ctx.drawImage(sourceCanvas, 0, 0);

  canvasElement.style.viewTransitionName = transitionName;
  canvasElement.classList.add("active");

  // CRITICAL: Wait for paint
  await afterFrameAsync();

  // Start transition
  const transition = document.startViewTransition(() => {
    canvasElement.classList.remove("active");
    showDestination();
  });

  await transition.finished;

  // Cleanup
  canvasElement.style.viewTransitionName = "";
  ctx.clearRect(...);
}
```

---

## Platform-Specific Handling

### iOS Limitations

**WebKit Bug**: iOS Safari cannot run two camera streams simultaneously.

References:
- https://bugs.webkit.org/show_bug.cgi?id=179363
- https://bugs.webkit.org/show_bug.cgi?id=238492

**Handling Throughout Codebase:**

| Location                    | iOS-Specific Behavior                    |
| --------------------------- | ---------------------------------------- |
| `getCameras()`              | Stop cameras immediately after discovery |
| `CameraProvider` init       | Force sequential mode, set `isIOS` signal |
| `CameraProvider.swapCameras`| Stop old stream before starting new      |
| `CameraProvider.resumeAllStreams` | Don't start overlay stream        |

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
padding-bottom: max(20px, env(safe-area-inset-bottom));
```

**Meta Tag:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

### Front Camera Orientation

**Problem**: Front cameras appear inverted without horizontal flip.

**Solution**:

1. `Camera.shouldFlip` returns `true` for front cameras (`facingMode === "user"`)
2. CSS class `.front-camera` applies `transform: scaleX(-1)`
3. Canvas drawing applies horizontal flip via context transform

```typescript
// CameraProvider.updateOrientation()
if (main?.shouldFlip) {
  mainEl.classList.add("front-camera");
}

// drawVideoToCanvas()
if (flipHorizontal) {
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
}
```

---

## Edge Cases & Bug Fixes

This section documents bugs discovered during development and their solutions.

### 1. iOS Camera Collision

**Problem**: On iOS, initializing multiple camera streams causes them to interfere.

**Solution**: Stop cameras immediately after discovery, only activate on-demand.

```typescript
// getCameras()
if (isIOS) {
  envCamera.stop();
  userCamera.stop();
}
```

---

### 2. Front Camera Orientation on Initial Render

**Problem**: Front cameras weren't flipped on initial render.

**Solution**: Call `updateOrientation()` after setting up streams in CameraProvider.

---

### 3. Touch Pointer Dragging Not Working

**Problem**: Overlay dragging didn't work with touch input.

**Solution**: Disable default touch actions on draggable elements.

```typescript
el.style.touchAction = "none";
```

---

### 4. Captured Frame Doesn't Match Display

**Problem**: Video continued playing between button press and canvas draw.

**Solution**: Pause videos before capturing.

```typescript
ctx.pauseVideos();  // FIRST
await doCapture();
```

---

### 5. ViewTransition Rendering Timing

**Problem**: ViewTransitions animation started before source was painted.

**Solution**: Use `afterframe` library to wait for paint.

```typescript
await afterFrameAsync();  // CRITICAL
document.startViewTransition(() => { ... });
```

---

### 6. Blob Conversion Blocking Dialog

**Problem**: Converting OffscreenCanvas to Blob blocked dialog animation.

**Solution**: Draw canvas directly for preview, defer blob conversion.

```typescript
ctx.drawImage(source, 0, 0);  // Immediate preview
dialog.showModal();
setTimeout(() => prepareDownload(), 0);  // Deferred
```

---

### 7. Drag-to-Snap Re-render Performance

**Problem**: Updating state during drag caused jank from re-renders.

**Solution**: Use refs during drag, only update signal on snap completion.

```typescript
// During drag: refs only
el.style.left = `${newX}px`;

// After snap: update signal
setTimeout(() => {
  overlayCorner.value = newCorner;
}, 250);  // After CSS transition
```

---

### 8. Canvas Overlay Positioning/Sizing

**Problem**: Fixed pixel values didn't scale with canvas upscaling.

**Solution**: Calculate scale factor and apply to all values.

```typescript
const scale = mainImage.width / viewportWidth;
const margin = 20 * scale;
const borderRadius = 16 * scale;
```

---

## Key Implementation Patterns

### Critical Design Principles

1. **Centralize Stream Lifecycle**: CameraProvider manages all stream operations. Never manage streams directly in components.

2. **iOS Must Be First-Class**: Design for sequential mode first. iOS detection happens at initialization.

3. **Paint Synchronization for Animations**: Any ViewTransitions usage must wait for paint using `afterframe`.

4. **Canvas Must Match CSS**: Overlay positioning, shadows, and rounded corners must be manually scaled.

5. **Signals for Shared State, Refs for Performance**: Use signals for cross-component state, refs for high-frequency updates (drag).

6. **Pause Before Capture**: Video elements must be paused before drawing to canvas.

### File Organization

```
src/
├── components/           # Preact components
│   ├── App.tsx
│   ├── CameraProvider.tsx
│   ├── CaptureDialog.tsx
│   ├── SettingsDialog.tsx
│   ├── MainVideo.tsx
│   ├── OverlayVideo.tsx
│   └── ...
├── hooks/               # Custom hooks
│   ├── useLiveCaptureMode.ts
│   ├── useSequentialCaptureMode.ts
│   └── useOverlayPosition.ts
├── state/               # Preact signals
│   ├── cameraSignals.ts
│   └── uiSignals.ts
├── canvas.ts            # Canvas compositing utilities
├── getCameras.ts        # Camera class and detection
├── CaptureAnimation.ts  # ViewTransitions animation
├── showStatus.ts        # Status message utility
├── settings.ts          # Settings persistence
├── debugLog.ts          # Debug utilities
├── pwa.ts              # PWA service worker
└── index.tsx           # Entry point
```

### Testing Requirements

1. **Device Testing**: Must test on actual iOS and Android devices
2. **Camera Testing**: Need device with front + back cameras
3. **Orientation Testing**: Test both portrait and landscape
4. **Single Camera Testing**: Test degraded mode with webcam
