import { debugLog } from "./debugLog.ts";
import { canvasToBlob } from "./canvas.ts";
import "./CaptureDialog.css";

/**
 * Custom element for displaying captured photos with download/share options
 */
export class CaptureDialog extends HTMLElement {
	private dialog: HTMLDialogElement;
	private canvas: HTMLCanvasElement;
	private downloadLink: HTMLAnchorElement;
	private shareBtn: HTMLButtonElement;
	private retakeBtn: HTMLButtonElement;
	private sourceCanvas: OffscreenCanvas | null = null;
	private blobPromise: Promise<Blob> | null = null;
	private blobUrl: string | null = null;

	constructor() {
		super();

		this.dialog = document.createElement("dialog");
		this.dialog.className = "capture-dialog";
		this.dialog.innerHTML = `
			<div class="capture-dialog-content">
				<canvas class="capture-dialog-image"></canvas>
				<div class="capture-dialog-actions">
					<a class="capture-dialog-btn download-btn disabled">Download</a>
					<button class="capture-dialog-btn share-btn" type="button">Share</button>
					<button class="capture-dialog-btn retake-btn" type="button">Retake</button>
				</div>
			</div>
		`;

		this.canvas = this.dialog.querySelector(".capture-dialog-image")!;
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
	 * Show the dialog with a captured image from OffscreenCanvas
	 * @param source The OffscreenCanvas containing the captured image
	 */
	show(source: OffscreenCanvas): void {
		this.cleanup();

		this.sourceCanvas = source;

		// Set canvas dimensions and draw the image
		this.canvas.width = source.width;
		this.canvas.height = source.height;
		const ctx = this.canvas.getContext("2d")!;
		ctx.drawImage(source, 0, 0);

		debugLog("CaptureDialog.show()", {
			width: source.width,
			height: source.height,
		});
		this.dialog.showModal();

		// Start blob conversion in the next major task (link will be enabled when ready)
		// so that the main thread work of convertToBlob doesn't block the dialog opening
		setTimeout(() => this.prepareDownload(), 0);
	}

	/**
	 * Get or create the blob from the source canvas.
	 * Caches the promise to avoid duplicate conversions.
	 */
	private getBlob(): Promise<Blob> {
		if (this.blobPromise) return this.blobPromise;
		if (!this.sourceCanvas) {
			return Promise.reject(new Error("No source canvas"));
		}

		performance.mark("blob-start");
		this.blobPromise = canvasToBlob(this.sourceCanvas).then((blob) => {
			const blobTime = performance.measure("blob-duration", "blob-start");
			debugLog("Blob conversion complete", {
				duration: blobTime.duration.toFixed(2),
				size: blob.size,
			});
			return blob;
		});

		return this.blobPromise;
	}

	/**
	 * Start blob conversion and enable download link when ready
	 */
	private async prepareDownload(): Promise<void> {
		try {
			const blob = await this.getBlob();

			// Enable download link
			this.blobUrl = URL.createObjectURL(blob);
			this.downloadLink.href = this.blobUrl;
			this.downloadLink.download = `dual-camera-${Date.now()}.jpg`;
			this.downloadLink.classList.remove("disabled");
		} catch (e) {
			debugLog("Blob conversion failed:", e, true);
		}
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
		if (!navigator.share) return;

		try {
			const blob = await this.getBlob();
			const file = new File([blob], `dual-camera-${Date.now()}.jpg`, {
				type: "image/jpeg",
			});

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
		this.sourceCanvas = null;
		this.blobPromise = null;

		// Revoke blob URL
		if (this.blobUrl) {
			URL.revokeObjectURL(this.blobUrl);
			this.blobUrl = null;
		}

		// Reset download link
		this.downloadLink.href = "";
		this.downloadLink.download = "";
		this.downloadLink.classList.add("disabled");

		// Clear canvas
		const ctx = this.canvas.getContext("2d");
		if (ctx) {
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}
	}
}

export function registerCaptureDialog(): void {
	customElements.define("capture-dialog", CaptureDialog);
}
