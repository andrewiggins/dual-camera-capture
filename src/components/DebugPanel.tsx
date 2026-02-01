import { useRef, useCallback, useEffect } from "preact/hooks";
import { hideDebugPanel, logDebugStartup, debugLog } from "../debugLog.ts";
import { settings } from "../settings.ts";
import "../debugLog.css";

export function DebugPanel() {
	const dialogRef = useRef<HTMLDialogElement | null>(null);

	const clearLogs = useCallback(() => {
		const logsContainer = document.getElementById("debugLogs");
		if (logsContainer) {
			logsContainer.innerHTML = "";
		}
		debugLog("Logs cleared");
	}, []);

	// Log debug startup info if debug is enabled on initial load
	useEffect(() => {
		if (settings.debug) {
			logDebugStartup();
		}
	}, []);

	const handleClose = useCallback(() => {
		hideDebugPanel();
	}, []);

	// The debug panel uses non-modal dialog, controlled by debugLog.ts functions
	// We just render the structure here

	return (
		<dialog id="debugPanel" ref={dialogRef}>
			<div id="debugHeader">
				<span>Debug Logs</span>
				<div id="debugActions">
					<button id="debugClear" type="button" onClick={clearLogs}>
						Clear
					</button>
					<button
						id="debugClose"
						type="button"
						aria-label="Close"
						onClick={handleClose}
					>
						&times;
					</button>
				</div>
			</div>
			<div id="debugLogs" />
		</dialog>
	);
}
