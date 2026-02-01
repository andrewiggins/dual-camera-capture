import { useRef, useEffect, useCallback } from "preact/hooks";
import { debugLog } from "../debugLog.ts";
import { canvasToBlob } from "../canvas.ts";
import { captureDialogOpen, capturedImage } from "../state/uiSignals.ts";
import { useCameraContext } from "./CameraProvider.tsx";
import "../CaptureDialog.css";

export function CaptureDialog() {
	const { playVideos } = useCameraContext();
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const downloadLinkRef = useRef<HTMLAnchorElement | null>(null);
	const blobPromiseRef = useRef<Promise<Blob> | null>(null);
	const blobUrlRef = useRef<string | null>(null);

	const cleanup = useCallback(() => {
		debugLog("CaptureDialog.cleanup()");

		blobPromiseRef.current = null;

		// Revoke blob URL
		if (blobUrlRef.current) {
			URL.revokeObjectURL(blobUrlRef.current);
			blobUrlRef.current = null;
		}

		// Reset download link
		const downloadLink = downloadLinkRef.current;
		if (downloadLink) {
			downloadLink.href = "";
			downloadLink.download = "";
			downloadLink.classList.add("disabled");
		}

		// Clear canvas
		const canvas = canvasRef.current;
		if (canvas) {
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}
		}
	}, []);

	const close = useCallback(() => {
		dialogRef.current?.close();
		cleanup();
		captureDialogOpen.value = false;
		capturedImage.value = null;
		playVideos();
	}, [cleanup, playVideos]);

	const getBlob = useCallback((): Promise<Blob> => {
		if (blobPromiseRef.current) return blobPromiseRef.current;

		const source = capturedImage.value;
		if (!source) {
			return Promise.reject(new Error("No source canvas"));
		}

		performance.mark("blob-start");
		blobPromiseRef.current = canvasToBlob(source).then((blob) => {
			const blobTime = performance.measure("blob-duration", "blob-start");
			debugLog("Blob conversion complete", {
				duration: blobTime.duration.toFixed(2),
				size: blob.size,
			});
			return blob;
		});

		return blobPromiseRef.current;
	}, []);

	const prepareDownload = useCallback(async () => {
		try {
			const blob = await getBlob();
			const downloadLink = downloadLinkRef.current;
			if (!downloadLink) return;

			blobUrlRef.current = URL.createObjectURL(blob);
			downloadLink.href = blobUrlRef.current;
			downloadLink.download = `dual-camera-${Date.now()}.jpg`;
			downloadLink.classList.remove("disabled");
		} catch (e) {
			debugLog("Blob conversion failed:", e, true);
		}
	}, [getBlob]);

	const handleShare = useCallback(async () => {
		if (!navigator.share) return;

		try {
			const blob = await getBlob();
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
	}, [getBlob]);

	// Handle dialog open/close based on signal
	useEffect(() => {
		const dialog = dialogRef.current;
		const canvas = canvasRef.current;
		const source = capturedImage.value;

		if (captureDialogOpen.value && source && dialog && canvas) {
			// Set canvas dimensions and draw the image
			canvas.width = source.width;
			canvas.height = source.height;
			const ctx = canvas.getContext("2d")!;
			ctx.drawImage(source, 0, 0);

			debugLog("CaptureDialog.show()", {
				width: source.width,
				height: source.height,
			});

			dialog.showModal();

			// Start blob conversion in the next major task (deferred)
			setTimeout(() => prepareDownload(), 0);
		}
	}, [captureDialogOpen.value, prepareDownload]);

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
			class="capture-dialog"
			onClick={handleDialogClick}
			onCancel={handleCancel}
		>
			<div class="capture-dialog-content">
				<canvas
					ref={canvasRef}
					class="capture-dialog-image"
					style={{ viewTransitionName: "dialog-image" }}
				/>
				<div class="capture-dialog-actions">
					<a
						ref={downloadLinkRef}
						class="capture-dialog-btn download-btn disabled"
					>
						Download
					</a>
					{"share" in navigator && (
						<button
							class="capture-dialog-btn share-btn"
							type="button"
							onClick={handleShare}
						>
							Share
						</button>
					)}
					<button
						class="capture-dialog-btn retake-btn"
						type="button"
						onClick={close}
					>
						Retake
					</button>
				</div>
			</div>
		</dialog>
	);
}
