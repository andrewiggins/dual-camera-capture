import { settingsDialogOpen } from "../state/uiSignals.ts";

export function SettingsButton() {
	const handleClick = () => {
		settingsDialogOpen.value = true;
	};

	return (
		<div id="controls-aux" class="controls">
			<button
				id="settingsBtn"
				type="button"
				aria-label="Settings"
				onClick={handleClick}
			>
				<svg width="22" height="22" aria-hidden="true">
					<use href="#icon-settings" />
				</svg>
			</button>
		</div>
	);
}
