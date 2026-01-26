import sharp from "sharp";
import { mkdir } from "fs/promises";

// Dual camera icon SVG - two overlapping camera viewfinders
function createIconSvg(size, isMaskable = false) {
	const padding = isMaskable ? Math.floor(size * 0.1) : 0;
	const innerSize = size - padding * 2;
	const scale = innerSize / 100;

	// Colors matching app theme
	const bgColor = "#0a0a0a";
	const fgColor = "#f5f0e8";
	const accentColor = "#e8a87c";

	return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bgColor}"/>
  <g transform="translate(${padding}, ${padding})">
    <!-- Back camera frame (larger, behind) -->
    <rect x="${20 * scale}" y="${25 * scale}" width="${45 * scale}" height="${50 * scale}" rx="${4 * scale}"
          fill="none" stroke="${fgColor}" stroke-width="${3 * scale}"/>
    <!-- Back camera lens indicator -->
    <circle cx="${42.5 * scale}" cy="${50 * scale}" r="${8 * scale}"
            fill="none" stroke="${fgColor}" stroke-width="${2 * scale}"/>

    <!-- Front camera frame (smaller, in front) -->
    <rect x="${45 * scale}" y="${35 * scale}" width="${35 * scale}" height="${40 * scale}" rx="${3 * scale}"
          fill="${bgColor}" stroke="${accentColor}" stroke-width="${3 * scale}"/>
    <!-- Front camera lens indicator -->
    <circle cx="${62.5 * scale}" cy="${55 * scale}" r="${6 * scale}"
            fill="none" stroke="${accentColor}" stroke-width="${2 * scale}"/>
  </g>
</svg>`;
}

async function generateIcon(size, filename, isMaskable = false) {
	const svg = createIconSvg(size, isMaskable);
	await sharp(Buffer.from(svg)).png().toFile(`public/${filename}`);
	console.log(`Generated: public/${filename}`);
}

async function main() {
	await mkdir("public", { recursive: true });

	await Promise.all([
		generateIcon(192, "pwa-192x192.png"),
		generateIcon(512, "pwa-512x512.png"),
		generateIcon(512, "maskable-icon-512x512.png", true),
		generateIcon(180, "apple-touch-icon-180x180.png"),
	]);

	console.log("All icons generated successfully!");
}

main().catch(console.error);
