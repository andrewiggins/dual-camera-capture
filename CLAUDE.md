# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a single-file web application that captures photos from both front and back cameras simultaneously. The entire application is contained in `index.html` with inline CSS and JavaScript.

## Architecture

**Single-File Application**: All code (HTML, CSS, JavaScript) is in `index.html`. There is no build process, bundling, or external dependencies.

**Camera Management**:

- Uses MediaDevices API to access multiple cameras
- Primary approach: Uses `facingMode` constraint ("environment" for back, "user" for front)
- Fallback: If facingMode fails, enumerates all video devices by deviceId
- Graceful degradation: If only one camera is available, enters single-camera mode with error overlay

**Stream Architecture**:

- `mainStream`: The primary camera feed (initially back camera, displayed full-screen)
- `overlayStream`: The secondary camera feed (initially front camera, displayed as picture-in-picture)
- Streams are swapped when user clicks "Switch Cameras" button or taps the overlay video

**Photo Capture**:

- Uses HTML5 Canvas to composite both video streams
- Main feed rendered at full canvas size
- Overlay feed rendered in top-left corner with rounded corners and white border
- If second camera unavailable, error overlay drawn on canvas instead
- Image downloaded as PNG with timestamp filename

**UI States**:

- Dual camera mode: Both cameras active, switch button enabled
- Single camera mode: One camera active, error overlay shown, switch button disabled
- Status messages shown temporarily in top-right corner

## Development

**Running Locally**: Open `index.html` directly in a browser or serve via any HTTP server (e.g., `python -m http.server`). HTTPS is required for camera access on non-localhost domains.

**Testing**: Must be tested on a device with multiple cameras (smartphones, tablets). Desktop browsers typically have only one webcam.

**Code Style**: Uses tabs for indentation (2-space visual width).

## Key Implementation Details

**Rounded Corners on Canvas**: The overlay in captured photos uses quadraticCurveTo to draw rounded rectangles, not CSS border-radius (which only affects DOM rendering).

**Error Handling**: Camera initialization errors are logged but app continues in degraded mode. No camera = error message shown.

**Browser Compatibility**: Relies on modern browser APIs (getUserMedia, Canvas, Blob). Mobile browsers must support "environment" facingMode constraint for best results.
