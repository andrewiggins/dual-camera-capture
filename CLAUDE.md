# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application that captures photos from both front and back cameras simultaneously.

## Architecture

**Technology Stack**: Preact + @preact/signals for UI and state management, Vite for builds, TypeScript with JSX.

**File Structure**:

- `index.html` - Minimal HTML with SVG sprite sheet and `<div id="app">`
- `src/index.tsx` - Entry point, renders `<App />` component
- `src/components/` - Preact components (App, CameraProvider, CaptureDialog, SettingsDialog, MainVideo, OverlayVideo, Controls, etc.)
- `src/hooks/` - Custom hooks (useLiveCaptureMode, useSequentialCaptureMode, useOverlayPosition)
- `src/state/` - Preact signals (cameraSignals.ts, uiSignals.ts)
- `src/canvas.ts` - Canvas utilities (drawVideoToCanvas, drawOverlayOnMainCanvas, canvasToBlob)
- `src/getCameras.ts` - `Camera` class, `FacingMode` type, `getCameras()` for camera enumeration
- `src/CaptureAnimation.ts` - `playCaptureAnimation()` function using ViewTransitions API
- `src/showStatus.ts` - Status message utility using signals
- `src/debugLog.ts` - Debug utilities (`debugLog`, `showDebugPanel`, `hideDebugPanel`, `logDebugStartup`)
- `src/settings.ts` - Settings persistence to localStorage
- `src/pwa.ts` - PWA service worker registration
- CSS files: `index.css`, `debugLog.css`, `CaptureDialog.css`, `CaptureAnimation.css`, `OverlayPosition.css`, `SettingsDialog.css`

**Build Process**: Vite with @preact/preset-vite. TypeScript with `tsc` for type checking only. JSX configured with `jsxImportSource: "preact"`.

**Dependencies**: `preact`, `@preact/signals` for UI/state, `afterframe` for paint synchronization in ViewTransitions.

**Component Architecture**:

- `CameraProvider` - Context provider that manages camera streams, video refs, and stream lifecycle
- `CaptureDialog` / `SettingsDialog` - Use native `<dialog>` element (top layer, no portal needed)
- `MainVideo` / `OverlayVideo` - Thin wrappers around video elements with refs from context
- `useLiveCaptureMode` - Hook for simultaneous dual camera capture (non-iOS)
- `useSequentialCaptureMode` - Hook for one-camera-at-a-time capture (iOS or optional)
- `useOverlayPosition` - Hook for drag-to-snap overlay positioning (uses refs during drag to avoid re-renders)

**State Management with Signals**:

- `cameraSignals.ts` - Camera state: `mainCamera`, `overlayCamera`, `isIOS`, `currentMode`, `sequentialStep`, `capturedOverlay`, `overlayCorner`
- `uiSignals.ts` - UI state: `captureDialogOpen`, `capturedImage`, `settingsDialogOpen`, `statusMessage`, `debugMode`, `updateAvailable`
- Signals provide fine-grained reactivity without prop drilling
- Use refs (not signals) for high-frequency updates like drag operations

**Camera Management**:

- `Camera` class wraps `MediaStream` with deviceId, facingMode, and `shouldFlip` tracking
- `CameraProvider` initializes cameras on mount and manages stream lifecycle
- iOS detection forces sequential mode (iOS can't run two camera streams simultaneously)
- On iOS, cameras stopped immediately after discovery; only one stream active at a time
- Graceful degradation to single-camera mode if only one camera available

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

iOS detection (in `CameraProvider.tsx`) uses user agent string and `maxTouchPoints` for iPad detection.
