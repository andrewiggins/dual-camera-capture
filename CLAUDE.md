# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application that captures photos from both front and back cameras simultaneously.

## Architecture

**File Structure**:

- `index.html` - HTML markup only
- `camera-viewer.html` - Simple camera tester for debugging
- `src/index.css` - Main application styles
- `src/debugLog.css` - Debug panel styles
- `src/CaptureDialog.css` - Capture preview dialog styles
- `src/CaptureAnimation.css` - Capture animation styles
- `src/OverlayPosition.css` - Overlay position/corner styles
- `src/SettingsDialog.css` - Settings dialog styles
- `src/index.ts` - Entry point (loads settings, initializes debug/PWA, registers custom elements, starts app)
- `src/DualCameraApp.ts` - `DualCameraApp` controller class, `CaptureMode` interface, iOS detection
- `src/elements.ts` - DOM element references
- `src/getCameras.ts` - `Camera` class, `FacingMode` type, `getCameras()` for camera enumeration
- `src/canvas.ts` - Canvas utilities using OffscreenCanvas (drawVideoToCanvas, drawOverlayOnMainCanvas, canvasToBlob)
- `src/LiveCaptureMode.ts` - `LiveCaptureMode` class (simultaneous dual camera)
- `src/SequentialCaptureMode.ts` - `SequentialCaptureMode` class (one camera at a time)
- `src/VideoStreamManager.ts` - `VideoStreamManager` class for centralized stream lifecycle
- `src/CaptureDialog.ts` - `CaptureDialog` custom element for photo preview before download
- `src/CaptureAnimation.ts` - `CaptureAnimation` class using ViewTransitions API for capture-to-dialog animations
- `src/OverlayPosition.ts` - `OverlayPosition` class with drag-to-snap overlay positioning
- `src/showStatus.ts` - `showStatus()` function for status messages
- `src/debugLog.ts` - Debug utilities (exports `debugLog`, `initDebug`, `showDebugPanel`, `hideDebugPanel`, `toggleDebugPanel`, `logDebugStartup`)
- `src/settings.ts` - `Settings` interface and localStorage persistence (`loadSettings`, `saveSettings`, `updateSetting`)
- `src/SettingsDialog.ts` - `SettingsDialog` custom element with debug mode toggle and PWA update button
- `src/pwa.ts` - PWA service worker registration and update management (`initPWA`, `onUpdateAvailable`, `triggerUpdate`)
- `src/vite-env.d.ts` - Vite client types

**Build Process**: Uses Vite for development server and production builds. TypeScript is used for type safety with `tsc` for type checking only (Vite handles compilation).

**Dependencies**: The `afterframe` library is used for scheduling callbacks after the next animation frame paint, used in capture animations.

**Camera Management**:

- `Camera` class wraps `MediaStream` and tracks deviceId, facingMode, and `shouldFlip` (true for front-facing cameras)
- `getCameras()` function initializes cameras using facingMode constraints first, then falls back to deviceId enumeration
- On iOS, cameras are stopped immediately after discovery to prevent stream collisions
- Cameras are initialized once at app startup, then passed to capture mode classes
- Graceful degradation: If only one camera is available, enters single-camera mode

**Class Architecture**:

- `DualCameraApp`: Main controller that manages capture modes and event listeners
- `Camera`: Wrapper class for MediaStream with deviceId/facingMode/shouldFlip tracking and start/stop lifecycle
- `VideoStreamManager`: Centralizes stream lifecycle, handles camera swapping, orientation updates, and overlay dimensions
- `LiveCaptureMode`: Handles simultaneous dual camera streams (non-iOS)
- `SequentialCaptureMode`: Handles one-camera-at-a-time capture (iOS or optional), supports single camera mode
- `CaptureDialog`: Custom element for photo preview with download/share options before saving
- `CaptureAnimation`: Animates captured image from viewport to CaptureDialog using ViewTransitions API
- `OverlayPosition`: Manages overlay drag-to-snap positioning across four corners
- `SettingsDialog`: Custom element for settings with debug mode toggle and PWA update button
- Both capture mode classes implement `CaptureMode` interface: `init()`, `capture()`, `cleanup()`, `pause()`, `resume()`

**Stream Architecture**:

- `VideoStreamManager` manages video element to camera stream bindings
- `mainCamera`: The primary `Camera` object (initially back/environment camera, displayed full-screen)
- `overlayCamera`: The secondary `Camera` object (initially front/user camera, displayed as picture-in-picture)
- Cameras are swapped when user clicks "Switch Cameras" button or taps the overlay
- Overlay can be dragged to any corner (top-left, top-right, bottom-left, bottom-right) using `OverlayPosition` class
- Each `Camera` manages its own `MediaStream` internally via `getStream()` and `stop()` methods
- Overlay dimensions dynamically match viewport aspect ratio via CSS custom properties

**Photo Capture**:

- Uses OffscreenCanvas to composite video streams (no DOM canvas element needed)
- Canvas captures viewport aspect ratio, not raw video stream dimensions
- Main feed rendered at full canvas size with object-fit: cover cropping applied
- Overlay feed rendered in user-selected corner (default top-left) with rounded corners and black border
- If second camera unavailable, no overlay is rendered (single camera mode)
- Captured photo shown in CaptureDialog for preview before download/share
- Web Share API supported for sharing on mobile devices
- Image downloaded as PNG with timestamp filename

**Capture Animation**:

- Uses ViewTransitions API to animate captured image from viewport to CaptureDialog
- `CaptureAnimation` class manages the transition with a temporary canvas element
- Falls back to immediate dialog display if ViewTransitions not supported

**Settings System**:

- `Settings` interface stores user preferences (currently just `debug` boolean)
- Settings persisted to localStorage via `loadSettings()` and `saveSettings()`
- `SettingsDialog` custom element provides UI for toggling debug mode
- Settings gear icon in top-right corner opens the dialog

**PWA Support**:

- Service worker provides offline capability using vite-plugin-pwa
- `initPWA()` registers service worker and sets up hourly update checks
- When updates are available, "Reload to Update" button appears in Settings dialog
- Manual update model: users control when to reload for new version

**UI States**:

- Dual camera mode: Both cameras active, switch button enabled
- Single camera mode: One camera active, switch button disabled, captures render without overlay
- Status messages shown temporarily in top-right corner via `showStatus()`

## Development

**Quick Start**:

```bash
npm install
npm run dev
```

**Running Locally**: Run `npm run dev` to start the Vite development server. HTTPS is required for camera access on non-localhost domains.

**Commands**:

- `npm run dev` - Start development server
- `npm start` - Alias for `npm run dev`
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally
- `npm run typecheck` - Run TypeScript type checker
- `npm run check-format` - Check code formatting with Prettier
- `npm run format` - Format code with Prettier

**Node Version**: Project uses Volta to pin Node.js 24.13.0.

**Deployment**: GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically builds and deploys to GitHub Pages on push to main branch.

**Testing**: Must be tested on a device with multiple cameras (smartphones, tablets). Desktop browsers typically have only one webcam. Test both portrait and landscape orientations on mobile.

**Code Style**: Uses tabs for indentation (2-space visual width).

## Key Implementation Details

**Mobile Viewport Handling**: Uses dynamic viewport height (`100dvh`) to handle Android/iOS browser chrome that slides in/out. Safe area insets (`env(safe-area-inset-bottom)`) ensure buttons stay visible above system UI (home indicators, navigation bars). The `viewport-fit=cover` meta tag enables safe area support.

**Front Camera Orientation**: Front-facing camera feed is horizontally flipped (`scaleX(-1)`) to create a mirror effect, preventing upside-down appearance in landscape mode. The `Camera.shouldFlip` property indicates which cameras need flipping, and `VideoStreamManager` applies the `.front-camera` CSS class accordingly. Canvas capture also applies the flip transformation when drawing front camera feeds.

**Rounded Corners on Canvas**: The overlay in captured photos uses quadraticCurveTo to draw rounded rectangles, not CSS border-radius (which only affects DOM rendering).

**Error Handling**: Camera initialization errors are logged but app continues in degraded mode. No camera = error message shown.

**Browser Compatibility**: Relies on modern browser APIs (getUserMedia, OffscreenCanvas, Blob, Web Share API, ViewTransitions API). Mobile browsers must support "environment" facingMode constraint for best results. ViewTransitions API is optional (graceful fallback).

**Sequential Capture Mode**: An alternative capture mode where photos are taken one at a time instead of using simultaneous camera streams:

1. User captures the first photo (becomes the overlay)
2. App automatically switches to the other camera
3. User captures the second photo (becomes the main image)
4. Photos are composited and downloaded

This mode is **forced on iOS** because iOS Safari cannot run two camera streams simultaneously (WebKit limitation). On other devices with multiple cameras, users can optionally switch to sequential mode using the "Sequential Mode" button.

iOS detection (in `DualCameraApp.ts`) uses user agent string and `maxTouchPoints` for iPad detection.
