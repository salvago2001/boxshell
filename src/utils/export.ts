import type { Box, Item } from '../types';
import { STATUS_CONFIG } from '../types';

// ─── Exportar JSON ─────────────────────────────────────────────────────────────

export interface ExportData {
  version: string;
  exportedAt: string;
  boxes: Box[];
  items: Item[];
}

/**
 * Descarga todos los datos como un archivo JSON.
 */
export function exportJSON(boxes: Box[], items: Item[]): void {
  const data: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    boxes,
    items,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  downloadBlob(blob, `boxsell-backup-${fecha}.json`);
}

/**
 * Lee e importa datos desde un archivo JSON.
 * Devuelve los datos si son válidos, o lanza un error.
 */
export async function importJSON(file: File): Promise<{ boxes: Box[]; items: Item[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as ExportData;

        // Validación básica
        if (!Array.isArray(data.boxes) || !Array.isArray(data.items)) {
          throw new Error('Formato de archivo inválido: faltan boxes o items.');
        }

        resolve({ boxes: data.boxes, items: data.items });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Error al parsear JSON'));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsText(file, 'UTF-8');
  });
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────────

/**
 * Descarga el inventario completo como CSV (compatible con Excel/Sheets).
 */
export function exportCSV(boxes: Box[], items: Item[]): void {
  const boxMap = new Map(boxes.map((b) => [b.id, b]));

  const headers = [
    'Nombre',
    'Descripción',
    'Caja',
    'Ubicación',
    'Estado',
    'Precio pedido (€)',
    'Precio vendido (€)',
    'Tags',
    'URL Wallapop',
    'NFC UID',
    'Creado',
    'Vendido el',
  ];

  const rows = items.map((item) => {
    const box = boxMap.get(item.boxId);
    return [
      escapeCsv(item.name),
      escapeCsv(item.description),
      escapeCsv(box?.name ?? ''),
      escapeCsv(box?.location ?? ''),
      escapeCsv(STATUS_CONFIG[item.status].label),
      item.price > 0 ? item.price.toFixed(2) : '',
      item.soldPrice > 0 ? item.soldPrice.toFixed(2) : '',
      escapeCsv(item.tags.join(', ')),
      escapeCsv(item.wallapopUrl),
      escapeCsv(item.nfcUid),
      item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES') : '',
      item.soldAt ? new Date(item.soldAt).toLocaleDateString('es-ES') : '',
    ];
  });

  const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
  // BOM para que Excel abra UTF-8 correctamente
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const fecha = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `boxsell-inventario-${fecha}.csv`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeCsv(value: string): string {
  if (!value) return '';
  // Si contiene punto y coma, coma o salto de línea, envolver en comillas
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Fotos ────────────────────────────────────────────────────────────────────

/**
 * Comprime una imagen al subirla y la devuelve como base64.
 * Máximo 800px en el lado más largo, calidad JPEG 75%.
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_SIZE = 800;
      let { width, height } = img;

      if (width > height && width > MAX_SIZE) {
        height = Math.round((height * MAX_SIZE) / width);
        width = MAX_SIZE;
      } else if (height > MAX_SIZE) {
        width = Math.round((width * MAX_SIZE) / height);
        height = MAX_SIZE;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener el contexto 2D del canvas.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Error al cargar la imagen.'));
    };

    img.src = objectUrl;
  });
}

/** Umbral de advertencia: 200 MB (IndexedDB no tiene el límite de 5 MB de localStorage) */
export const STORAGE_WARNING_BYTES = 200 * 1024 * 1024;
