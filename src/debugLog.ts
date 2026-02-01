import { settings } from "./settings.ts";
import "./debugLog.css";

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

function getDebugPanel(): HTMLDialogElement | null {
	return document.getElementById("debugPanel") as HTMLDialogElement | null;
}

export function showDebugPanel(): void {
	const panel = getDebugPanel();
	if (panel && !panel.open) {
		panel.show(); // Non-modal dialog
	}
}

export function hideDebugPanel(): void {
	const panel = getDebugPanel();
	if (panel?.open) {
		panel.close();
	}
}

export function toggleDebugPanel(): void {
	const panel = getDebugPanel();
	if (panel?.open) {
		hideDebugPanel();
	} else {
		showDebugPanel();
	}
}

export function logDebugStartup(): void {
	console.log("=== DEBUG MODE ENABLED ===");
	console.log("User Agent:", navigator.userAgent);
	console.log("URL:", window.location.href);

	debugLog("DEBUG MODE ENABLED");
	debugLog("User Agent: " + navigator.userAgent);
	debugLog("URL: " + window.location.href);
}
