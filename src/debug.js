// Check for debug mode via URL parameter
const urlParams = new URLSearchParams(window.location.search);
export const DEBUG = urlParams.has("debug");

let debugPanelVisible = false;

function escapeHtml(text) {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

export function debugLog(message, data = null, isError = false) {
	if (!DEBUG) return;
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
			let dataStr;
			try {
				dataStr = JSON.stringify(data, null, 2);
			} catch (e) {
				dataStr = String(data);
			}
			html += `<span class="data">${escapeHtml(dataStr)}</span>`;
		}

		entry.innerHTML = html;
		logsContainer.appendChild(entry);
		logsContainer.scrollTop = logsContainer.scrollHeight;
	}
}

function toggleDebugPanel() {
	debugPanelVisible = !debugPanelVisible;
	const panel = document.getElementById("debugPanel");
	const toggle = document.getElementById("debugToggle");
	if (debugPanelVisible) {
		panel.classList.add("show");
		toggle.textContent = "Hide Logs";
	} else {
		panel.classList.remove("show");
		toggle.textContent = "Show Logs";
	}
}

function clearDebugLogs() {
	const logsContainer = document.getElementById("debugLogs");
	if (logsContainer) {
		logsContainer.innerHTML = "";
	}
	debugLog("Logs cleared");
}

export function initDebug() {
	// Debug button event listeners
	document
		.getElementById("debugToggle")
		.addEventListener("click", toggleDebugPanel);
	document
		.getElementById("debugClear")
		.addEventListener("click", clearDebugLogs);

	if (DEBUG) {
		// Show debug toggle button
		document.getElementById("debugToggle").classList.add("show");

		console.log("=== DEBUG MODE ENABLED ===");
		console.log("User Agent:", navigator.userAgent);
		console.log("URL:", window.location.href);

		debugLog("DEBUG MODE ENABLED");
		debugLog("User Agent: " + navigator.userAgent);
		debugLog("URL: " + window.location.href);
	}
}
