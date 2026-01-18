import { debugLog } from "./debug.ts";
import "./capture-dialog.css";

/**
 * Custom element for displaying captured photos with download/share options
 */
export class CaptureDialog extends HTMLElement {
	private dialog: HTMLDialogElement;
	private image: HTMLImageElement;
	private downloadLink: HTMLAnchorElement;
	private shareBtn: HTMLButtonElement;
	private retakeBtn: HTMLButtonElement;
	private currentBlob: Blob | null = null;
	private currentUrl: string | null = null;

	constructor() {
		super();

		this.dialog = document.createElement("dialog");
		this.dialog.className = "capture-dialog";
		this.dialog.innerHTML = `
			<div class="capture-dialog-content">
				<img class="capture-dialog-image" alt="Captured photo" />
				<div class="capture-dialog-actions">
					<a class="capture-dialog-btn download-btn" download>Download</a>
					<button class="capture-dialog-btn share-btn" type="button">Share</button>
					<button class="capture-dialog-btn retake-btn" type="button">Take Another</button>
				</div>
			</div>
		`;

		this.image = this.dialog.querySelector(".capture-dialog-image")!;
		this.downloadLink = this.dialog.querySelector(".download-btn")!;
		this.shareBtn = this.dialog.querySelector(".share-btn")!;
		this.retakeBtn = this.dialog.querySelector(".retake-btn")!;

		this.setupEventListeners();
	}

	connectedCallback(): void {
		this.appendChild(this.dialog);
		this.updateShareButtonVisibility();
	}

	disconnectedCallback(): void {
		this.cleanup();
	}

	private setupEventListeners(): void {
		this.shareBtn.addEventListener("click", () => this.handleShare());
		this.retakeBtn.addEventListener("click", () => this.close());

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
	}

	private updateShareButtonVisibility(): void {
		// Hide share button if Web Share API is not available
		if (!navigator.share) {
			this.shareBtn.style.display = "none";
		}
	}

	/**
	 * Show the dialog with a captured image blob
	 */
	show(blob: Blob): void {
		this.cleanup();

		this.currentBlob = blob;
		this.currentUrl = URL.createObjectURL(blob);

		this.image.src = this.currentUrl;
		this.downloadLink.href = this.currentUrl;
		this.downloadLink.download = `dual-camera-${Date.now()}.png`;

		debugLog("CaptureDialog.show()", { blobSize: blob.size });
		this.dialog.showModal();
	}

	/**
	 * Close the dialog and emit retake event
	 */
	close(): void {
		this.dialog.close();
		this.cleanup();
		this.dispatchEvent(new CustomEvent("retake"));
	}

	private async handleShare(): Promise<void> {
		if (!this.currentBlob || !navigator.share) return;

		const file = new File([this.currentBlob], `dual-camera-${Date.now()}.png`, {
			type: "image/png",
		});

		try {
			await navigator.share({
				files: [file],
				title: "Dual Camera Photo",
			});
		} catch (e) {
			// User cancelled or share failed - ignore
			if ((e as Error).name !== "AbortError") {
				debugLog("Share failed:", e, true);
			}
		}
	}

	private cleanup(): void {
		debugLog("CaptureDialog.cleanup()");
		if (this.currentUrl) {
			URL.revokeObjectURL(this.currentUrl);
			this.currentUrl = null;
		}
		this.currentBlob = null;
	}
}

export function registerCaptureDialog(): void {
	customElements.define("capture-dialog", CaptureDialog);
}
