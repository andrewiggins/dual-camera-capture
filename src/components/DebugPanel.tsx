import type { DebugEntry } from "../hooks/useDebug.ts";

function escapeHtml(text: string): string {
	const div = document.createElement("div");
	div.textContent = text;
	return div.innerHTML;
}

interface DebugPanelProps {
	isDebugMode: boolean;
	isPanelVisible: boolean;
	logs: DebugEntry[];
	onToggle: () => void;
	onClear: () => void;
}

export function DebugPanel({
	isDebugMode,
	isPanelVisible,
	logs,
	onToggle,
	onClear,
}: DebugPanelProps) {
	if (!isDebugMode) {
		return null;
	}

	return (
		<>
			<button id="debugToggle" class="show" onClick={onToggle}>
				{isPanelVisible ? "Hide Logs" : "Show Logs"}
			</button>
			<div id="debugPanel" class={isPanelVisible ? "show" : ""}>
				<div id="debugHeader">
					<span>Debug Logs</span>
					<button id="debugClear" onClick={onClear}>
						Clear
					</button>
				</div>
				<div id="debugLogs">
					{logs.map((entry, index) => (
						<div
							key={index}
							class={"debug-entry" + (entry.isError ? " error" : "")}
							dangerouslySetInnerHTML={{
								__html: `<span class="timestamp">[${entry.timestamp}]</span> <span class="message">${escapeHtml(entry.message)}</span>${entry.data ? `<span class="data">${escapeHtml(entry.data)}</span>` : ""}`,
							}}
						/>
					))}
				</div>
			</div>
		</>
	);
}
