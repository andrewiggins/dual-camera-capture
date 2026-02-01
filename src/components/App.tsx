import { CameraProvider } from "./CameraProvider.tsx";
import { MainLayout } from "./MainLayout.tsx";
import { CaptureDialog } from "./CaptureDialog.tsx";
import { SettingsDialog } from "./SettingsDialog.tsx";
import { DebugPanel } from "./DebugPanel.tsx";

export function App() {
	return (
		<CameraProvider>
			<MainLayout />
			<CaptureDialog />
			<SettingsDialog />
			<DebugPanel />
		</CameraProvider>
	);
}
