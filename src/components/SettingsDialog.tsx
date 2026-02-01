import { useRef, useEffect, useCallback } from "preact/hooks";
import { settings, updateSetting } from "../settings.ts";
import {
	showDebugPanel,
	hideDebugPanel,
	logDebugStartup,
} from "../debugLog.ts";
import { onUpdateAvailable, triggerUpdate } from "../pwa.ts";
import {
	settingsDialogOpen,
	updateAvailable,
	debugMode,
} from "../state/uiSignals.ts";
import "../SettingsDialog.css";

export function SettingsDialog() {
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const debugToggleRef = useRef<HTMLInputElement | null>(null);

	const close = useCallback(() => {
		dialogRef.current?.close();
		settingsDialogOpen.value = false;
	}, []);

	const handleDebugToggle = useCallback(() => {
		const newValue = debugToggleRef.current?.checked ?? false;
		updateSetting("debug", newValue);
		debugMode.value = newValue;

		if (newValue) {
			logDebugStartup();
		} else {
			hideDebugPanel();
		}
	}, []);

	const handleViewLogs = useCallback(() => {
		close();
		showDebugPanel();
	}, [close]);

	const handleUpdate = useCallback(() => {
		triggerUpdate();
	}, []);

	// Handle dialog open/close based on signal
	useEffect(() => {
		const dialog = dialogRef.current;
		const debugToggle = debugToggleRef.current;

		if (settingsDialogOpen.value && dialog) {
			// Sync UI with settings
			if (debugToggle) {
				debugToggle.checked = settings.debug;
			}
			debugMode.value = settings.debug;
			dialog.showModal();
		}
	}, [settingsDialogOpen.value]);

	// Subscribe to PWA update availability
	useEffect(() => {
		const unsubscribe = onUpdateAvailable((available) => {
			updateAvailable.value = available;
		});
		return unsubscribe;
	}, []);

	// Initialize debug mode from settings
	useEffect(() => {
		debugMode.value = settings.debug;
	}, []);

	// Handle backdrop click
	const handleDialogClick = useCallback(
		(e: MouseEvent) => {
			if (e.target === dialogRef.current) {
				close();
			}
		},
		[close],
	);

	// Handle cancel (Escape key)
	const handleCancel = useCallback(
		(e: Event) => {
			e.preventDefault();
			close();
		},
		[close],
	);

	return (
		<dialog
			ref={dialogRef}
			class="settings-dialog"
			onClick={handleDialogClick}
			onCancel={handleCancel}
		>
			<div class="settings-dialog-content">
				<div class="settings-dialog-header">
					<h2>Settings</h2>
					<button class="settings-close-btn" aria-label="Close" onClick={close}>
						&times;
					</button>
				</div>
				<div class="settings-dialog-body">
					<label class="settings-toggle">
						<span>Debug Mode</span>
						<input
							ref={debugToggleRef}
							type="checkbox"
							onChange={handleDebugToggle}
						/>
						<span class="toggle-switch" />
					</label>
					{debugMode.value && (
						<button class="settings-view-logs-btn" onClick={handleViewLogs}>
							View Debug Logs
						</button>
					)}
					{updateAvailable.value && (
						<button class="settings-update-btn" onClick={handleUpdate}>
							Reload to Update
						</button>
					)}
				</div>
			</div>
		</dialog>
	);
}
