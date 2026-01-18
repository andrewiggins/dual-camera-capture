import { debugLog, initDebug } from "./debug.ts";
import { registerCaptureDialog } from "./capture-dialog.ts"; // Register custom element before DOM queries
import { DualCameraApp } from "./app.ts";
import "./index.css";

// Initialize debug module
initDebug();
registerCaptureDialog();

// Start application
debugLog("Page loaded, starting app initialization");
const app = new DualCameraApp();
app.init();
