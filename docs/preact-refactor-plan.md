# Preact Migration Plan - Dual Camera Capture

## Overview

Refactor the Dual Camera Capture app from vanilla TypeScript with custom elements to Preact components with hooks and Signals. Preserve all performance optimizations, edge cases, and bug fixes.

## State Management: Preact Signals

Using `@preact/signals` for:

- Fine-grained reactivity (no unnecessary re-renders)
- Avoiding re-renders during drag-to-snap operations
- Cross-component state without prop drilling
- Refs-like behavior for timing-critical code

---

## Component Architecture

```
<App>
  <CameraProvider>              # Context for stream management + refs
    <MainLayout>
      <MainVideo />             # Full-screen main camera
      <OverlayVideo />          # PiP overlay (or error state)
      <SequentialPreview />     # Sequential mode captured overlay
      <SequentialInstructions />
      <CaptureAnimatedCanvas /> # ViewTransition animation target
      <StatusMessage />
      <Controls>
        <ModeToggleButton />
        <CaptureButton />
        <SwitchCamerasButton />
      </Controls>
      <SettingsButton />
    </MainLayout>
    <CaptureDialog />           # Native dialog top layer (no portal needed)
    <SettingsDialog />          # Native dialog top layer (no portal needed)
    <DebugPanel />
  </CameraProvider>
</App>
```

---

## Signal State Organization

### `src/state/cameraSignals.ts`

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

### `src/state/uiSignals.ts`

```typescript
// Dialog state
export const captureDialogOpen = signal(false);
export const capturedImage = signal<OffscreenCanvas | null>(null);
export const settingsDialogOpen = signal(false);

// Status message
export const statusMessage = signal<string | null>(null);

// Settings
export const debugMode = signal(false);
export const updateAvailable = signal(false);
```

---

## Key Components & Hooks

### CameraProvider (`src/components/CameraProvider.tsx`)

- Owns `mainVideoRef` and `overlayVideoRef`
- Initializes cameras on mount via `getCameras()`
- Handles iOS-specific stream lifecycle (stop old before start new)
- Provides context with: `swapCameras()`, `pauseVideos()`, `playVideos()`, `stopAllStreams()`, `resumeAllStreams()`
- Handles `visibilitychange` event with proper cleanup

### useLiveCaptureMode (`src/hooks/useLiveCaptureMode.ts`)

- Returns `capture()` function
- Pauses videos, draws to canvas, runs animation, opens dialog
- Listens for dialog close to resume videos

### useSequentialCaptureMode (`src/hooks/useSequentialCaptureMode.ts`)

- Uses `sequentialStep` and `capturedOverlay` signals
- Step 1: Capture overlay, animate to preview, swap cameras
- Step 2: Capture main, composite with overlay, show dialog, reset

### useOverlayPosition (`src/hooks/useOverlayPosition.ts`)

- Manages pointer events for drag-to-snap
- Uses refs directly (no state during drag to avoid re-renders)
- Updates `overlayCorner` signal only on snap completion
- Preserves 250ms CSS transition timing
- Preserves `touchAction: "none"` for mobile

### CaptureDialog (`src/components/CaptureDialog.tsx`)

- Uses native `<dialog>` element with `.showModal()` (renders in browser's top layer, no portal needed)
- Preserves deferred blob conversion pattern (setTimeout to next task)
- Caches blob promise to avoid duplicate conversions

---

## Critical Patterns to Preserve

### 1. iOS Stream Management

```typescript
// In CameraProvider swapCameras()
if (isIOS.value) {
	overlayCamera.value.stop(); // MUST stop old first
	mainVideoRef.current!.srcObject = await mainCamera.value.getStream();
	overlayVideoRef.current!.srcObject = null;
}
```

### 2. ViewTransitions + afterframe Timing

```typescript
// In CaptureAnimation utility (keep as class, accept refs)
await afterFrameAsync(); // CRITICAL: wait for paint before transition
const transition = document.startViewTransition(() => {
	canvasRef.current!.classList.remove("active");
	showDestination();
});
await transition.finished;
```

### 3. Deferred Blob Conversion

```typescript
// In CaptureDialog
useSignalEffect(() => {
	if (captureDialogOpen.value && capturedImage.value) {
		dialogRef.current?.showModal();
		// Deferred: doesn't block dialog open animation
		setTimeout(() => {
			blobPromise.current = canvasToBlob(capturedImage.value!);
		}, 0);
	}
});
```

### 4. Drag-to-Snap Timing

```typescript
// In useOverlayPosition - after drag release
el.classList.remove("overlay-dragging"); // Re-enables transitions
el.style.left = `${targetPos.left}px`; // Triggers animation

setTimeout(() => {
	el.style.left = ""; // Remove inline styles
	applyCornerClass(newCorner);
	overlayCorner.value = newCorner; // Signal update after animation
}, 250); // Matches CSS transition duration
```

### 5. JPEG Quality 0.75

```typescript
// In canvas.ts - keep unchanged
canvas.convertToBlob({ type: "image/jpeg", quality: 0.75 });
```

---

## Files to Create

### New Files

- `src/state/cameraSignals.ts` - Camera and stream signals
- `src/state/uiSignals.ts` - UI state signals
- `src/components/App.tsx` - Root component
- `src/components/CameraProvider.tsx` - Camera context + stream management
- `src/components/MainLayout.tsx` - Main container
- `src/components/MainVideo.tsx` - Main video element wrapper
- `src/components/OverlayVideo.tsx` - Overlay video element wrapper
- `src/components/Controls.tsx` - Control buttons container
- `src/components/CaptureButton.tsx`
- `src/components/ModeToggleButton.tsx`
- `src/components/SwitchButton.tsx`
- `src/components/SettingsButton.tsx`
- `src/components/StatusMessage.tsx`
- `src/components/CaptureDialog.tsx` - Photo preview (native dialog top layer)
- `src/components/SettingsDialog.tsx` - Settings (native dialog top layer)
- `src/components/DebugPanel.tsx` - Debug logs
- `src/components/SequentialPreview.tsx`
- `src/components/SequentialInstructions.tsx`
- `src/hooks/useLiveCaptureMode.ts`
- `src/hooks/useSequentialCaptureMode.ts`
- `src/hooks/useOverlayPosition.ts`
- `src/hooks/useSettings.ts`
- `src/hooks/useVisibilityChange.ts`

### Modified Files

- `vite.config.ts` - Uncomment `@preact/preset-vite`
- `tsconfig.json` - Add JSX config for Preact
- `package.json` - Add `preact`, `@preact/signals` dependencies
- `src/index.ts` - Render Preact `<App />` instead of `new DualCameraApp()`
- `src/CaptureAnimation.ts` - Accept refs instead of `getElementById()`
- `index.html` - Add `<div id="app"></div>`, remove custom element tags

### Deleted Files

- `src/elements.ts` - No longer needed (using refs)
- `src/DualCameraApp.ts` - Replaced by App + CameraProvider
- `src/LiveCaptureMode.ts` - Replaced by hook
- `src/SequentialCaptureMode.ts` - Replaced by hook
- `src/VideoStreamManager.ts` - Merged into CameraProvider
- `src/CaptureDialog.ts` - Replaced by Preact component
- `src/SettingsDialog.ts` - Replaced by Preact component
- `src/OverlayPosition.ts` - Replaced by hook

### Kept Unchanged

- `src/canvas.ts` - Pure utility functions
- `src/getCameras.ts` - Camera class
- `src/debugLog.ts` - Debug utilities
- `src/pwa.ts` - PWA utilities
- `src/showStatus.ts` - Update to use signal
- All CSS files - No changes needed

---

## Implementation Order

### Phase 1: Infrastructure Setup

1. Install `preact`, `@preact/signals`, `@preact/preset-vite`
2. Configure Vite and TypeScript for Preact JSX
3. Create signal state files
4. Create `<App />` shell that renders existing HTML structure

### Phase 2: CameraProvider

1. Extract VideoStreamManager logic into CameraProvider
2. Create video element refs and context
3. Implement iOS-specific stream handling
4. Add visibility change handling with cleanup

### Phase 3: UI Components

1. Create MainVideo, OverlayVideo (thin wrappers using context)
2. Create Controls, buttons
3. Create StatusMessage using signal
4. Adapt CaptureAnimation to accept refs

### Phase 4: Capture Mode Hooks

1. Implement useLiveCaptureMode
2. Implement useSequentialCaptureMode with step state machine
3. Wire up capture button to current mode

### Phase 5: Dialogs & Overlays

1. Convert CaptureDialog to Preact component (uses native dialog top layer)
2. Convert SettingsDialog to Preact component (uses native dialog top layer)
3. Implement useOverlayPosition hook with pointer events
4. Create DebugPanel component

### Phase 6: Cleanup

1. Delete old class files
2. Update index.html
3. Remove elements.ts
4. Fix any remaining event listener leaks

---

## Verification Plan

1. **iOS Safari**: Test stream management (only one stream at a time)
2. **Chrome Android**: Test live mode with both streams
3. **Drag-to-snap**: Test all four corners, verify 250ms timing
4. **ViewTransition**: Test capture animation smoothness
5. **Sequential mode**: Test full two-step workflow
6. **Dialog**: Verify deferred blob conversion, download/share work
7. **Settings**: Verify debug mode toggle persists to localStorage
8. **PWA**: Verify update available flow still works
9. **Visibility**: Background/foreground app, verify streams pause/resume
10. **Single camera**: Test graceful degradation with one camera
