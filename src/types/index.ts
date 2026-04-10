// Tipos principales de BoxSell

export type ItemStatus = 'draft' | 'stock' | 'reserved' | 'sold';

export interface Box {
  id: string;           // UUID generado en app
  nfcUid: string;       // UID del tag NFC grabado en la caja
  name: string;         // "Caja A", "Electrónica 1", etc.
  description: string;
  location: string;     // "Trastero", "Salón", etc.
  color: string;        // color de etiqueta visual en UI (hex)
  createdAt: string;    // ISO 8601
}

export interface Item {
  id: string;           // UUID generado en app
  nfcUid: string;       // UID del tag NFC pegado en el objeto (opcional)
  boxId: string;        // referencia a la caja contenedora
  name: string;
  description: string;
  price: number;        // precio pedido en Wallapop
  soldPrice: number;    // precio real de venta
  status: ItemStatus;
  wallapopUrl: string;  // enlace al anuncio
  photos: string[];     // base64 comprimidas
  tags: string[];       // categorías libres
  notes: string;
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
  soldAt: string;       // ISO 8601 (solo si status === 'sold')
}

export interface AppSettings {
  darkMode: boolean;
  appUrl: string;       // URL base para grabar en tags NFC
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// Estadísticas calculadas para el dashboard
export interface DashboardStats {
  totalItems: number;
  stockItems: number;
  reservedItems: number;
  soldItems: number;
  draftItems: number;
  totalBoxes: number;
  totalRevenue: number;      // suma de soldPrice de items vendidos
  pendingRevenue: number;    // suma de price de items en stock/reservado
}

// Resultado de búsqueda NFC/QR
export type NFCLookupResult =
  | { type: 'box'; id: string }
  | { type: 'item'; id: string }
  | null;

// Colores predefinidos para cajas
export const BOX_COLORS = [
  '#FF6B2B', // naranja (brand)
  '#3B82F6', // azul
  '#10B981', // verde
  '#F59E0B', // ámbar
  '#8B5CF6', // violeta
  '#EC4899', // rosa
  '#06B6D4', // cyan
  '#EF4444', // rojo
  '#84CC16', // lima
  '#6B7280', // gris
];

// Etiquetas de estado con sus colores
export const STATUS_CONFIG: Record<ItemStatus, {
  label: string;
  color: string;
  bg: string;
  tailwind: string;
}> = {
  draft: {
    label: 'Borrador',
    color: '#9CA3AF',
    bg: '#1A1D24',
    tailwind: 'text-gray-400 bg-gray-900/50 border-gray-700',
  },
  stock: {
    label: 'En stock',
    color: '#60A5FA',
    bg: '#0F1B35',
    tailwind: 'text-blue-400 bg-blue-950/50 border-blue-800',
  },
  reserved: {
    label: 'Reservado',
    color: '#FBBF24',
    bg: '#2A1F08',
    tailwind: 'text-amber-400 bg-amber-950/50 border-amber-800',
  },
  sold: {
    label: 'Vendido',
    color: '#34D399',
    bg: '#061F16',
    tailwind: 'text-emerald-400 bg-emerald-950/50 border-emerald-800',
  },
};
