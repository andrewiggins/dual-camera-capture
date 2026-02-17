import { registerSW } from "virtual:pwa-register";

type UpdateListener = (available: boolean) => void;

let updateAvailable = false;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
const listeners: UpdateListener[] = [];

/**
 * Initialize PWA service worker registration.
 * Sets up periodic update checks (hourly) and notifies listeners when updates are available.
 */
export function initPWA(): void {
	updateSW = registerSW({
		onNeedRefresh() {
			updateAvailable = true;
			notifyListeners();

			// Immediately activate the new service worker so that a natural
			// browser reload will serve the updated assets.  Passing `false`
			// tells the helper to skip waiting without forcing a page reload.
			if (updateSW) {
				updateSW(false);
			}
		},
		onOfflineReady() {
			console.log("PWA: App ready for offline use");
		},
	});

	// Check for updates periodically (every hour)
	setInterval(
		async () => {
			try {
				const registration = await navigator.serviceWorker.getRegistration();
				if (registration) {
					await registration.update();
				}
			} catch (error) {
				console.error("PWA: Error checking for updates", error);
			}
		},
		60 * 60 * 1000,
	);
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
