import { useState, useCallback, useRef, useEffect } from "preact/hooks";

export interface UseStatusResult {
	message: string | null;
	isVisible: boolean;
	showStatus: (message: string, duration?: number | null) => void;
}

/**
 * Hook to manage status message display with auto-hide
 */
export function useStatus(): UseStatusResult {
	const [message, setMessage] = useState<string | null>(null);
	const [isVisible, setIsVisible] = useState(false);
	const timeoutRef = useRef<number | null>(null);

	const showStatus = useCallback(
		(newMessage: string, duration: number | null = null) => {
			// Clear any existing timeout
			if (timeoutRef.current !== null) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}

			setMessage(newMessage);
			setIsVisible(true);

			if (duration !== null) {
				timeoutRef.current = window.setTimeout(() => {
					setIsVisible(false);
					timeoutRef.current = null;
				}, duration);
			}
		},
		[],
	);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current !== null) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return { message, isVisible, showStatus };
}
