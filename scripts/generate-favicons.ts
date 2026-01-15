/**
 * Generate favicons for SEO and browser compatibility
 * This script generates all required favicon sizes from a source favicon.png
 * 
 * Generated files:
 * - favicon.ico (multi-resolution: 16x16, 32x32)
 * - favicon-48x48.png
 * - favicon-96x96.png
 * - favicon-144x144.png
 * - favicon-192x192.png
 * - favicon.png (192x192, main favicon)
 * - apple-touch-icon.png (180x180)
 */

import sharp from 'sharp';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import toIco from 'to-ico';

const PUBLIC_DIR = join(process.cwd(), 'public');
const SOURCE_FAVICON = join(PUBLIC_DIR, 'favicon.png');

// Sizes recommended by Google for SEO (multiples of 48px)
const FAVICON_SIZES = [48, 96, 144, 192] as const;

// Sizes for favicon.ico (multi-resolution)
const ICO_SIZES = [16, 32] as const;

// Apple touch icon size
const APPLE_TOUCH_ICON_SIZE = 180;

async function generateFavicons() {
  try {
    console.log('[generate-favicons] Reading source favicon from:', SOURCE_FAVICON);

    // Check if source file exists
    try {
      await readFile(SOURCE_FAVICON);
    } catch (error) {
      console.error(
        '[generate-favicons] ERROR: Source favicon.png not found at:',
        SOURCE_FAVICON
      );
      console.error(
        '[generate-favicons] Please ensure favicon.png exists in the public/ directory'
      );
      process.exit(1);
    }

    // Generate PNG favicons (multiples of 48px for Google)
    console.log('[generate-favicons] Generating PNG favicons...');
    const pngBuffers: Buffer[] = [];

    for (const size of FAVICON_SIZES) {
      const outputPath = join(PUBLIC_DIR, `favicon-${size}x${size}.png`);
      const buffer = await sharp(SOURCE_FAVICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      await writeFile(outputPath, buffer);
      console.log(`[generate-favicons] ✓ Generated favicon-${size}x${size}.png`);
      pngBuffers.push(buffer);
    }

    // Generate main favicon.png (192x192)
    const mainFaviconPath = join(PUBLIC_DIR, 'favicon.png');
    const mainFaviconBuffer = await sharp(SOURCE_FAVICON)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    await writeFile(mainFaviconPath, mainFaviconBuffer);
    console.log('[generate-favicons] ✓ Generated favicon.png (192x192)');

    // Generate Apple Touch Icon (180x180)
    const appleTouchIconPath = join(PUBLIC_DIR, 'apple-touch-icon.png');
    const appleTouchIconBuffer = await sharp(SOURCE_FAVICON)
      .resize(APPLE_TOUCH_ICON_SIZE, APPLE_TOUCH_ICON_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    await writeFile(appleTouchIconPath, appleTouchIconBuffer);
    console.log(
      `[generate-favicons] ✓ Generated apple-touch-icon.png (${APPLE_TOUCH_ICON_SIZE}x${APPLE_TOUCH_ICON_SIZE})`
    );

    // Generate favicon.ico (multi-resolution: 16x16, 32x32)
    console.log('[generate-favicons] Generating favicon.ico (multi-resolution)...');
    const icoBuffers: Buffer[] = [];

    for (const size of ICO_SIZES) {
      const buffer = await sharp(SOURCE_FAVICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      icoBuffers.push(buffer);
    }

    const icoFile = await toIco(icoBuffers);
    const icoPath = join(PUBLIC_DIR, 'favicon.ico');
    await writeFile(icoPath, icoFile);
    console.log(
      `[generate-favicons] ✓ Generated favicon.ico (${ICO_SIZES.join('x')} and ${ICO_SIZES[1]}x${ICO_SIZES[1]})`
    );

    console.log('[generate-favicons] ✓ All favicons generated successfully!');
    console.log('[generate-favicons] Generated files:');
    console.log('  - favicon.ico');
    console.log('  - favicon.png (192x192)');
    console.log('  - apple-touch-icon.png (180x180)');
    FAVICON_SIZES.forEach((size) => {
      console.log(`  - favicon-${size}x${size}.png`);
    });
  } catch (error) {
    console.error('[generate-favicons] Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
