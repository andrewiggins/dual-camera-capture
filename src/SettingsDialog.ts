import { settings, updateSetting } from "./settings.ts";
import { showDebugPanel, hideDebugPanel, logDebugStartup } from "./debugLog.ts";
import "./SettingsDialog.css";

/**
 * Custom element for settings dialog with debug mode toggle
 */
export class SettingsDialog extends HTMLElement {
	private dialog: HTMLDialogElement;
	private debugToggleInput: HTMLInputElement;
	private viewLogsBtn: HTMLButtonElement;

	constructor() {
		super();

		this.dialog = document.createElement("dialog");
		this.dialog.className = "settings-dialog";
		this.dialog.innerHTML = `
			<div class="settings-dialog-content">
				<div class="settings-dialog-header">
					<h2>Settings</h2>
					<button class="settings-close-btn" aria-label="Close">&times;</button>
				</div>
				<div class="settings-dialog-body">
					<label class="settings-toggle">
						<span>Debug Mode</span>
						<input type="checkbox" id="debugToggleInput" />
						<span class="toggle-switch"></span>
					</label>
					<button class="settings-view-logs-btn" style="display:none">View Debug Logs</button>
				</div>
			</div>
		`;

		this.debugToggleInput = this.dialog.querySelector("#debugToggleInput")!;
		this.viewLogsBtn = this.dialog.querySelector(".settings-view-logs-btn")!;

		this.setupEventListeners();
	}

	connectedCallback(): void {
		this.appendChild(this.dialog);
		this.syncUIWithSettings();
	}

	private setupEventListeners(): void {
		// Close button
		this.dialog
			.querySelector(".settings-close-btn")!
			.addEventListener("click", () => this.close());

		// Close on backdrop click
		this.dialog.addEventListener("click", (e) => {
			if (e.target === this.dialog) {
				this.close();
			}
		});

		// Close on Escape key
		this.dialog.addEventListener("cancel", (e) => {
			e.preventDefault();
			this.close();
		});

		// Debug toggle change
		this.debugToggleInput.addEventListener("change", () => {
			this.handleDebugToggle();
		});

		// View Debug Logs button
		this.viewLogsBtn.addEventListener("click", () => {
			this.close();
			showDebugPanel();
		});
	}

	private syncUIWithSettings(): void {
		this.debugToggleInput.checked = settings.debug;
		this.updateViewLogsVisibility();
	}

	private handleDebugToggle(): void {
		const newValue = this.debugToggleInput.checked;
		updateSetting("debug", newValue);
		this.updateViewLogsVisibility();

		if (newValue) {
			logDebugStartup();
		} else {
			hideDebugPanel();
		}

		this.dispatchEvent(
			new CustomEvent("settings-changed", {
				detail: { key: "debug", value: newValue },
			}),
		);
	}

	private updateViewLogsVisibility(): void {
		this.viewLogsBtn.style.display = settings.debug ? "block" : "none";
	}

	show(): void {
		this.syncUIWithSettings();
		this.dialog.showModal();
	}

	close(): void {
		this.dialog.close();
	}
}

export function registerSettingsDialog(): void {
	customElements.define("settings-dialog", SettingsDialog);
}
