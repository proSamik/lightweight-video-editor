const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Generate missing icon files for electron-builder
 * This script converts the SVG icon to various formats and sizes using sharp
 */

const ICONS_DIR = path.join(__dirname, '..', 'build', 'icons');
const SVG_SOURCE = path.join(__dirname, '..', 'assets', 'icon.svg');

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

console.log('Generating icon files...');

async function generateIcons() {
  try {
    // Read the SVG file
    const svgBuffer = fs.readFileSync(SVG_SOURCE);
    
    // Generate PNG icons for macOS and Linux
    const pngSizes = [16, 32, 48, 64, 128, 256, 512];
    
    for (const size of pngSizes) {
      const outputFile = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputFile);
      
      console.log(`✓ Generated ${outputFile}`);
    }

    // Create the main icon.png (512x512) for macOS
    const mainIconPath = path.join(ICONS_DIR, 'icon.png');
    const mainIconSource = path.join(ICONS_DIR, 'icon-512x512.png');
    
    if (fs.existsSync(mainIconSource)) {
      fs.copyFileSync(mainIconSource, mainIconPath);
      console.log('✓ Created main icon.png for macOS');
    }

    // For Windows ICO, we'll create a simple PNG that can be converted later
    // The existing icon.ico should work, but let's create a backup PNG
    const windowsIconPath = path.join(ICONS_DIR, 'icon-windows.png');
    await sharp(svgBuffer)
      .resize(256, 256)
      .png()
      .toFile(windowsIconPath);
    
    console.log('✓ Created icon-windows.png (can be converted to ICO if needed)');

    console.log('\nIcon generation complete!');
    console.log('Generated files:');
    fs.readdirSync(ICONS_DIR).forEach(file => {
      console.log(`  - ${file}`);
    });

    console.log('\nNote: For Windows ICO file, you may need to convert icon-windows.png to ICO format');
    console.log('You can use online converters or tools like ImageMagick: convert icon-windows.png icon.ico');

  } catch (error) {
    console.error('Error generating icons:', error.message);
    console.log('\nAlternative: You can manually create the required icons:');
    console.log('1. Convert assets/icon.svg to PNG (512x512) and save as build/icons/icon.png');
    console.log('2. Create various sizes for Linux: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256');
    console.log('3. Ensure build/icons/icon.ico exists for Windows');
    process.exit(1);
  }
}

generateIcons(); 