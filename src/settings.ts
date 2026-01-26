export interface Settings {
	debug: boolean;
}

const STORAGE_KEY = "dual-camera-settings";
const DEFAULT_SETTINGS: Settings = { debug: false };

export const settings: Settings = { ...DEFAULT_SETTINGS };

export function loadSettings(): void {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as Partial<Settings>;
			if (typeof parsed.debug === "boolean") {
				settings.debug = parsed.debug;
			}
		}
	} catch {
		// Ignore localStorage errors (e.g., private browsing mode)
	}
}

export function saveSettings(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// Ignore localStorage errors
	}
}

export function updateSetting<K extends keyof Settings>(
	key: K,
	value: Settings[K],
): void {
	settings[key] = value;
	saveSettings();
}
