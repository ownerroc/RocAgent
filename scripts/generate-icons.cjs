const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a simple blue gradient icon (ROC style)
const sizes = [72, 96, 128, 144, 192, 512];

async function generateIcons() {
  console.log('🎨 Generating PWA icons...');
  
  for (const size of sizes) {
    // Create SVG with gradient
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
        <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">ROC</text>
      </svg>
    `;
    
    const outputPath = path.join(iconsDir, `icon-${size}.png`);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Created icon-${size}.png`);
  }
  
  console.log('🎉 All icons generated!');
}

generateIcons().catch(console.error);
