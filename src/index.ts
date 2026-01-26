import { loadSettings } from "./settings.ts";
import { debugLog, initDebug } from "./debugLog.ts";
import { registerCaptureDialog } from "./CaptureDialog.ts";
import { registerSettingsDialog, SettingsDialog } from "./SettingsDialog.ts";
import { DualCameraApp } from "./DualCameraApp.ts";
import "./index.css";

// Load settings from localStorage first
loadSettings();

// Initialize debug module
initDebug();

// Register custom elements
registerCaptureDialog();
registerSettingsDialog();

// Set up settings button click handler
const settingsBtn = document.getElementById("settingsBtn");
const settingsDialog = document.getElementById(
	"settingsDialog",
) as SettingsDialog;
settingsBtn?.addEventListener("click", () => {
	settingsDialog?.show();
});

// Start application
debugLog("Page loaded, starting app initialization");
const app = new DualCameraApp();
app.init();
