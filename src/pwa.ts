import { registerSW } from "virtual:pwa-register";

type UpdateListener = (available: boolean) => void;

let updateAvailable = false;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
const listeners: UpdateListener[] = [];

/**
 * Initialize PWA service worker registration.
 * Checks for updates when the tab becomes visible.
 * When an update is found, the user is prompted to reload.
 */
export function initPWA(): void {
	updateSW = registerSW({
		onNeedRefresh() {
			updateAvailable = true;
			notifyListeners();
		},
		onOfflineReady() {
			console.log("PWA: App ready for offline use");
		},
	});

	// Check for updates when the tab becomes visible (e.g. user switches
	// back to the app after it's been in the background).
	document.addEventListener("visibilitychange", async () => {
		if (document.visibilityState === "visible") {
			try {
				const registration = await navigator.serviceWorker.getRegistration();
				if (registration) {
					await registration.update();
				}
			} catch (error) {
				console.error("PWA: Error checking for updates", error);
			}
		}
	});
}

/**
 * Subscribe to update availability changes.
 * The listener is called immediately with the current state and whenever it changes.
 */
export function onUpdateAvailable(listener: UpdateListener): () => void {
	listeners.push(listener);
	// Call immediately with current state
	listener(updateAvailable);
	// Return unsubscribe function
	return () => {
		const index = listeners.indexOf(listener);
		if (index > -1) {
			listeners.splice(index, 1);
		}
	};
}

/**
 * Trigger the update by reloading the page with the new service worker.
 */
export function triggerUpdate(): void {
	if (updateSW) {
		updateSW(true);
	}
}

function notifyListeners(): void {
	for (const listener of listeners) {
		listener(updateAvailable);
	}
}
