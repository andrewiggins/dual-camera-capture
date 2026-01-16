import { debugLog, initDebug } from "./debug.js";
import { DualCameraApp } from "./app.js";

// Initialize debug module
initDebug();

// Start application
debugLog("Page loaded, starting app initialization");
const app = new DualCameraApp();
app.init();
