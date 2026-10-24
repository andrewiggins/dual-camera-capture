import { render } from "preact";
import { loadSettings, settings } from "./settings.ts";
import { aspectRatio } from "./state/cameraSignals.ts";
import { debugLog } from "./debugLog.ts";
import { initPWA } from "./pwa.ts";
import { App } from "./components/App.tsx";
import "./index.css";

// Load settings from localStorage first
loadSettings();
aspectRatio.value = settings.aspectRatio;

// Initialize PWA service worker
initPWA();

// Start application
debugLog("Page loaded, starting app initialization");

const container = document.getElementById("app");
if (container) {
	render(<App />, container);
}
