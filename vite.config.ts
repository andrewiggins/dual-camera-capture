import type { UserConfig } from "vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import preact from "@preact/preset-vite";

// https://vitejs.dev/config/
const viteConfig: UserConfig = defineConfig({
	base: "/dual-camera-capture/",
	plugins: [
		preact(),
		VitePWA({
			minify: false,
			registerType: "prompt",
			includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
			manifest: {
				id: "/dual-camera-capture/",
				name: "Dual Camera Capture",
				short_name: "DualCam",
				description: "Capture photos from both cameras simultaneously",
				theme_color: "#0a0a0a",
				background_color: "#0a0a0a",
				display: "standalone",
				orientation: "any",
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "maskable-icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
				globIgnores: ["camera-viewer.html"],
			},
		}),
	],
	build: {
		minify: false,
		modulePreload: {
			polyfill: false,
		},
	},
	// test: {
	// 	projects: [
	// 		{
	// 			test: {
	// 				name: "happy-dom",
	// 				root: "./test",
	// 				environment: "happy-dom",
	// 			},
	// 		},
	// 	],
	// },
});
export default viteConfig;
