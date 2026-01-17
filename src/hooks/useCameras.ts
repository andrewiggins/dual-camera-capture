import { useState, useEffect } from "preact/hooks";
import { Camera, getCameras } from "../lib/camera.ts";

export interface UseCamerasResult {
	cameras: Camera[];
	isReady: boolean;
	error: string | null;
}

/**
 * Hook to initialize and manage cameras
 */
export function useCameras(): UseCamerasResult {
	const [cameras, setCameras] = useState<Camera[]>([]);
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		async function initCameras() {
			try {
				const detectedCameras = await getCameras();
				if (mounted) {
					setCameras(detectedCameras);
					setIsReady(true);
					if (detectedCameras.length === 0) {
						setError("No cameras found");
					}
				}
			} catch (e) {
				if (mounted) {
					setError((e as Error).message);
					setIsReady(true);
				}
			}
		}

		initCameras();

		return () => {
			mounted = false;
		};
	}, []);

	return { cameras, isReady, error };
}
