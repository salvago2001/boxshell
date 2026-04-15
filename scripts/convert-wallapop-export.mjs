// Convierte wallapop-export.json (array plano) al formato que espera BoxSell
// { exportedAt, boxes: [], items: [] }
// Uso: node scripts/convert-wallapop-export.mjs

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath  = join(__dirname, 'wallapop-export.json');
const outputPath = join(__dirname, 'wallapop-boxsell.json');

const raw = readFileSync(inputPath, 'utf8');
const items = JSON.parse(raw);

if (!Array.isArray(items)) {
  console.error('ERROR: wallapop-export.json no es un array. Formato inesperado.');
  process.exit(1);
}

const boxsellData = {
  exportedAt: new Date().toISOString(),
  boxes: [],
  items,
};

writeFileSync(outputPath, JSON.stringify(boxsellData, null, 2), 'utf8');
console.log(`✓ Convertido: ${items.length} artículos`);
console.log(`✓ Guardado en: scripts/wallapop-boxsell.json`);
console.log(`  Importa ese archivo en BoxSell desde Ajustes → Importar JSON`);
