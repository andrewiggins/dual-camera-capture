export type AspectRatio = "screen" | "16:9" | "4:3";

export const ASPECT_RATIO_OPTIONS: {
	value: AspectRatio;
	name: string;
	detail: string;
}[] = [
	{ value: "16:9", name: "Wide Crop", detail: "16:9" },
	{ value: "4:3", name: "Full", detail: "4:3" },
	{ value: "screen", name: "Screen size", detail: "Fill screen" },
];

function isAspectRatio(value: unknown): value is AspectRatio {
	return ASPECT_RATIO_OPTIONS.some((o) => o.value === value);
}

export interface Settings {
	debug: boolean;
	aspectRatio: AspectRatio;
}

const STORAGE_KEY = "dual-camera-settings";
const DEFAULT_SETTINGS: Settings = { debug: false, aspectRatio: "screen" };

export const settings: Settings = { ...DEFAULT_SETTINGS };

export function loadSettings(): void {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as Partial<Settings>;
			if (typeof parsed.debug === "boolean") {
				settings.debug = parsed.debug;
			}
			if (isAspectRatio(parsed.aspectRatio)) {
				settings.aspectRatio = parsed.aspectRatio;
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
