const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG for each size
sizes.forEach(size => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0f172a"/>
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${size * 0.6}" 
    font-weight="bold" 
    fill="#ffffff" 
    text-anchor="middle" 
    dominant-baseline="central">L</text>
</svg>`;

  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`Generated ${svgPath}`);
});

// Create a simple PNG placeholder script instruction
console.log('\nSVG icons generated successfully!');
console.log('To convert to PNG, you can:');
console.log('1. Use an online converter like cloudconvert.com');
console.log('2. Or install sharp: pnpm add -D sharp');
console.log('3. Then run a converter script with sharp');

// Alternative: If sharp is available, convert to PNG
try {
  const sharp = require('sharp');
  
  Promise.all(
    sizes.map(async size => {
      const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
      const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      
      console.log(`Converted to PNG: ${pngPath}`);
    })
  ).then(() => {
    console.log('\nAll icons converted to PNG successfully!');
  });
} catch (err) {
  console.log('\nSharp not installed. SVG icons are available.');
  console.log('Install sharp with: pnpm add -D sharp');
}
