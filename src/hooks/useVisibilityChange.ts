import { useEffect } from "preact/hooks";

/**
 * Hook to handle document visibility changes
 */
export function useVisibilityChange(
	onHidden: () => void,
	onVisible: () => void,
): void {
	useEffect(() => {
		function handleVisibilityChange() {
			if (document.hidden) {
				onHidden();
			} else {
				onVisible();
			}
		}

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [onHidden, onVisible]);
}
