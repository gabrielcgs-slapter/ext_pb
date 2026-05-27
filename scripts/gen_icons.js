// scripts/gen_icons.js
const fs = require('fs');
const path = require('path');

function makePlaceholderPng() {
  // Menor PNG válido 16x16 em base64
  const MINIMAL_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVQ4jWNgYGBgAAAABQABXvMqGgAAAABJRU5ErkJggg==',
    'base64'
  );
  return MINIMAL_PNG;
}

const iconsDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });
for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), makePlaceholderPng());
}
console.log('Ícones placeholder criados em icons/');
