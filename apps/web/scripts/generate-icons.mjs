import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

const svgContent = readFileSync(join(iconsDir, 'icon.svg'), 'utf8');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'apple-touch-icon-180.png', size: 180 },
];

async function generateIcons() {
  for (const { name, size } of sizes) {
    // For maskable icon, add padding
    const padding = name.includes('maskable') ? Math.round(size * 0.1) : 0;
    const innerSize = size - (padding * 2);
    
    let buffer;
    if (padding > 0) {
      // Create with safe zone padding for maskable
      const inner = await sharp(Buffer.from(svgContent))
        .resize(innerSize, innerSize)
        .toBuffer();
      
      buffer = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 11, g: 15, b: 23, alpha: 1 }
        }
      })
        .composite([{ input: inner, gravity: 'center' }])
        .png()
        .toBuffer();
    } else {
      buffer = await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toBuffer();
    }
    
    writeFileSync(join(iconsDir, name), buffer);
    console.log(`Generated ${name}`);
  }
  
  console.log('All icons generated!');
}

generateIcons().catch(console.error);
