import { useState, useCallback, useRef } from "preact/hooks";

// Check for debug mode via URL parameter
const urlParams = new URLSearchParams(window.location.search);
export const DEBUG = urlParams.has("debug");

export interface DebugEntry {
	timestamp: string;
	message: string;
	data: string | null;
	isError: boolean;
}

export interface UseDebugResult {
	isDebugMode: boolean;
	isPanelVisible: boolean;
	logs: DebugEntry[];
	togglePanel: () => void;
	clearLogs: () => void;
	debugLog: (message: string, data?: unknown, isError?: boolean) => void;
}

/**
 * Hook to manage debug panel state and logging
 */
export function useDebug(): UseDebugResult {
	const [isPanelVisible, setIsPanelVisible] = useState(false);
	const [logs, setLogs] = useState<DebugEntry[]>(() => {
		if (DEBUG) {
			return [
				{
					timestamp: new Date().toISOString().split("T")[1].slice(0, 12),
					message: "DEBUG MODE ENABLED",
					data: null,
					isError: false,
				},
				{
					timestamp: new Date().toISOString().split("T")[1].slice(0, 12),
					message: "User Agent: " + navigator.userAgent,
					data: null,
					isError: false,
				},
				{
					timestamp: new Date().toISOString().split("T")[1].slice(0, 12),
					message: "URL: " + window.location.href,
					data: null,
					isError: false,
				},
			];
		}
		return [];
	});

	// Use ref to avoid stale closure in debugLog
	const logsRef = useRef(logs);
	logsRef.current = logs;

	const togglePanel = useCallback(() => {
		setIsPanelVisible((prev) => !prev);
	}, []);

	const clearLogs = useCallback(() => {
		const clearEntry: DebugEntry = {
			timestamp: new Date().toISOString().split("T")[1].slice(0, 12),
			message: "Logs cleared",
			data: null,
			isError: false,
		};
		setLogs([clearEntry]);
	}, []);

	const debugLog = useCallback(
		(message: string, data: unknown = null, isError = false) => {
			if (!DEBUG) return;

			const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);

			// Console logging
			if (data !== null) {
				console.log(`[DEBUG ${timestamp}] ${message}`, data);
			} else {
				console.log(`[DEBUG ${timestamp}] ${message}`);
			}

			// Add to logs state
			let dataStr: string | null = null;
			if (data !== null) {
				try {
					dataStr = JSON.stringify(data, null, 2);
				} catch {
					dataStr = String(data);
				}
			}

			const entry: DebugEntry = {
				timestamp,
				message,
				data: dataStr,
				isError,
			};

			setLogs((prev) => [...prev, entry]);
		},
		[],
	);

	return {
		isDebugMode: DEBUG,
		isPanelVisible,
		logs,
		togglePanel,
		clearLogs,
		debugLog,
	};
}
