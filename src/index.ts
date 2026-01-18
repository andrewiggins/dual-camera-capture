import { debugLog, initDebug } from "./debugLog.ts";
import { registerCaptureDialog } from "./CaptureDialog.ts"; // Register custom element before DOM queries
import { DualCameraApp } from "./DualCameraApp.ts";
import "./index.css";

// Initialize debug module
initDebug();
registerCaptureDialog();

// Start application
debugLog("Page loaded, starting app initialization");
const app = new DualCameraApp();
app.init();
