interface StatusMessageProps {
	message: string | null;
	isVisible: boolean;
}

export function StatusMessage({ message, isVisible }: StatusMessageProps) {
	return (
		<div id="status" class={isVisible ? "show" : ""}>
			{message}
		</div>
	);
}
