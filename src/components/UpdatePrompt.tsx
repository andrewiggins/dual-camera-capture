import { useEffect, useCallback } from "preact/hooks";
import { onUpdateAvailable, triggerUpdate } from "../pwa.ts";
import {
	updateAvailable,
	updatePromptDismissed,
} from "../state/uiSignals.ts";
import "./UpdatePrompt.css";

export function UpdatePrompt() {
	useEffect(() => {
		return onUpdateAvailable((available) => {
			updateAvailable.value = available;
		});
	}, []);

	const handleReload = useCallback(() => {
		triggerUpdate();
	}, []);

	const handleDismiss = useCallback(() => {
		updatePromptDismissed.value = true;
	}, []);

	if (!updateAvailable.value || updatePromptDismissed.value) {
		return null;
	}

	return (
		<div class="update-prompt" role="alert">
			<span class="update-prompt-message">A new version is available</span>
			<button class="update-prompt-reload" onClick={handleReload}>
				Reload
			</button>
			<button
				class="update-prompt-dismiss"
				onClick={handleDismiss}
				aria-label="Dismiss"
			>
				&times;
			</button>
		</div>
	);
}
