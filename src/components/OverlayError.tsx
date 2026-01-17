interface OverlayErrorProps {
	show: boolean;
}

export function OverlayError({ show }: OverlayErrorProps) {
	return (
		<div id="overlayError" class={show ? "show" : ""}>
			<div class="error-content">
				<div class="error-icon">⚠️</div>
				<div class="error-message">Second camera not available</div>
			</div>
		</div>
	);
}
