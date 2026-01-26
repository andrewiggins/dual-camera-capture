import { settings } from "./settings.ts";
import "./debugLog.css";

let debugPanelVisible = false;

function escapeHtml(text: string): string {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

export function debugLog(
	message: string,
	data: unknown = null,
	isError = false,
): void {
	if (!settings.debug) return;
	const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);

	// Console logging
	if (data !== null) {
		console.log(`[DEBUG ${timestamp}] ${message}`, data);
	} else {
		console.log(`[DEBUG ${timestamp}] ${message}`);
	}

	// On-screen logging
	const logsContainer = document.getElementById("debugLogs");
	if (logsContainer) {
		const entry = document.createElement("div");
		entry.className = "debug-entry" + (isError ? " error" : "");

		const escapedMsg = escapeHtml(message);
		let html = `<span class="timestamp">[${timestamp}]</span> <span class="message">${escapedMsg}</span>`;
		if (data !== null) {
			let dataStr: string;
			try {
				dataStr = JSON.stringify(data, null, 2);
			} catch {
				dataStr = String(data);
			}
			html += `<span class="data">${escapeHtml(dataStr)}</span>`;
		}

		entry.innerHTML = html;
		logsContainer.appendChild(entry);
		logsContainer.scrollTop = logsContainer.scrollHeight;
	}
}

export function showDebugPanel(): void {
	debugPanelVisible = true;
	const panel = document.getElementById("debugPanel");
	panel?.classList.add("show");
}

export function hideDebugPanel(): void {
	debugPanelVisible = false;
	const panel = document.getElementById("debugPanel");
	panel?.classList.remove("show");
}

export function toggleDebugPanel(): void {
	if (debugPanelVisible) {
		hideDebugPanel();
	} else {
		showDebugPanel();
	}
}

function clearDebugLogs(): void {
	const logsContainer = document.getElementById("debugLogs");
	if (logsContainer) {
		logsContainer.innerHTML = "";
	}
	debugLog("Logs cleared");
}

export function logDebugStartup(): void {
	console.log("=== DEBUG MODE ENABLED ===");
	console.log("User Agent:", navigator.userAgent);
	console.log("URL:", window.location.href);

	debugLog("DEBUG MODE ENABLED");
	debugLog("User Agent: " + navigator.userAgent);
	debugLog("URL: " + window.location.href);
}

export function initDebug(): void {
	// Debug panel clear button event listener
	document
		.getElementById("debugClear")
		?.addEventListener("click", clearDebugLogs);

	// Debug panel close on header click (to hide panel)
	document.getElementById("debugHeader")?.addEventListener("click", (e) => {
		// Only toggle if clicking header directly, not the clear button
		if ((e.target as HTMLElement).id === "debugHeader") {
			hideDebugPanel();
		}
	});

	// Log startup info if debug is already enabled (from localStorage)
	if (settings.debug) {
		logDebugStartup();
	}
}
