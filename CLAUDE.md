# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application that captures photos from both front and back cameras simultaneously.

## Architecture

**File Structure**:

- `index.html` - HTML markup only
- `src/index.css` - Main application styles
- `src/debug.css` - Debug panel styles
- `src/index.js` - Entry point (initializes debug and starts app)
- `src/app.js` - `DualCameraApp` controller class (manages modes and event listeners)
- `src/elements.js` - DOM element references
- `src/device-info.js` - `DeviceInfo` singleton (iOS detection, camera enumeration)
- `src/capture-utils.js` - `CaptureUtils` (canvas drawing, camera access, download)
- `src/ui-utils.js` - `UIUtils` (status messages, orientation updates)
- `src/live-capture-mode.js` - `LiveCaptureMode` class (simultaneous dual camera)
- `src/sequential-capture-mode.js` - `SequentialCaptureMode` class (one camera at a time)
- `src/debug.js` - Debug utilities (exports `DEBUG`, `debugLog`, `initDebug`)

**No Build Process**: Uses native ES modules (`type="module"`) supported by modern browsers. No bundling or external dependencies.

**Camera Management**:

- Uses MediaDevices API to access multiple cameras
- Primary approach: Uses `facingMode` constraint ("environment" for back, "user" for front)
- Fallback: If facingMode fails, enumerates all video devices by deviceId
- Graceful degradation: If only one camera is available, enters single-camera mode with error overlay

**Class Architecture**:

- `DualCameraApp`: Main controller that manages capture modes and event listeners
- `LiveCaptureMode`: Handles simultaneous dual camera streams (non-iOS)
- `SequentialCaptureMode`: Handles one-camera-at-a-time capture (iOS or optional)
- Both mode classes implement the same interface: `init()`, `capture()`, `switchCameras()`, `cleanup()`

**Stream Architecture**:

- `mainStream`: The primary camera feed (initially back camera, displayed full-screen)
- `overlayStream`: The secondary camera feed (initially front camera, displayed as picture-in-picture)
- Streams are swapped when user clicks "Switch Cameras" button or taps the overlay video

**Photo Capture**:

- Uses HTML5 Canvas to composite both video streams
- Main feed rendered at full canvas size
- Overlay feed rendered in top-left corner with rounded corners and black border
- If second camera unavailable, error overlay drawn on canvas instead
- Image downloaded as PNG with timestamp filename

**UI States**:

- Dual camera mode: Both cameras active, switch button enabled
- Single camera mode: One camera active, error overlay shown, switch button disabled
- Status messages shown temporarily in top-right corner

## Development

**Running Locally**: Open `index.html` directly in a browser or serve via any HTTP server (e.g., `python -m http.server`). HTTPS is required for camera access on non-localhost domains.

**Deployment**: GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys to GitHub Pages on push to main branch. No build step required - deploys the static files directly.

**Testing**: Must be tested on a device with multiple cameras (smartphones, tablets). Desktop browsers typically have only one webcam. Test both portrait and landscape orientations on mobile.

**Code Style**: Uses tabs for indentation (2-space visual width).

## Key Implementation Details

**Mobile Viewport Handling**: Uses dynamic viewport height (`100dvh`) to handle Android/iOS browser chrome that slides in/out. Safe area insets (`env(safe-area-inset-bottom)`) ensure buttons stay visible above system UI (home indicators, navigation bars). The `viewport-fit=cover` meta tag enables safe area support.

**Front Camera Orientation**: Front-facing camera feed is horizontally flipped (`scaleX(-1)`) to create a mirror effect, preventing upside-down appearance in landscape mode. The `updateCameraOrientation()` function tracks which camera is active and applies the `.front-camera` CSS class. Canvas capture also applies the flip transformation when drawing front camera feeds.

**Rounded Corners on Canvas**: The overlay in captured photos uses quadraticCurveTo to draw rounded rectangles, not CSS border-radius (which only affects DOM rendering).

**Error Handling**: Camera initialization errors are logged but app continues in degraded mode. No camera = error message shown.

**Browser Compatibility**: Relies on modern browser APIs (getUserMedia, Canvas, Blob). Mobile browsers must support "environment" facingMode constraint for best results.

**Sequential Capture Mode**: An alternative capture mode where photos are taken one at a time instead of using simultaneous camera streams:
1. User captures the first photo (becomes the overlay)
2. App automatically switches to the other camera
3. User captures the second photo (becomes the main image)
4. Photos are composited and downloaded

This mode is **forced on iOS** because iOS Safari cannot run two camera streams simultaneously (WebKit limitation). On other devices with multiple cameras, users can optionally switch to sequential mode using the "Sequential Mode" button. The `sequentialMode` flag controls which UI and capture flow is active.

iOS detection uses user agent string and `maxTouchPoints` for iPad detection.
