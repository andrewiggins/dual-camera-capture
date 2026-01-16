import { debugLog, initDebug } from "./debug.ts";
import { DualCameraApp } from "./app.ts";
import "./index.css";

// Initialize debug module
initDebug();

// Start application
debugLog("Page loaded, starting app initialization");
const app = new DualCameraApp();
app.init();
