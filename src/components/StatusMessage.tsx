import { statusMessage } from "../state/uiSignals.ts";

export function StatusMessage() {
	const message = statusMessage.value;
	const showClass = message ? "show" : "";

	return (
		<div id="status" class={showClass}>
			{message}
		</div>
	);
}
