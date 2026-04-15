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

export interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userKey: string;      // código de sincronización — identifica los datos del usuario
  enabled: boolean;
  lastSyncAt: string;   // ISO timestamp de la última sync exitosa
}

export interface AppSettings {
  darkMode: boolean;
  appUrl: string;       // URL base para grabar en tags NFC
  sync?: SyncConfig;
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
    bg: '#F3F4F6',
    tailwind: 'text-gray-500 bg-gray-100 border-gray-300 dark:text-gray-400 dark:bg-gray-900/50 dark:border-gray-700',
  },
  stock: {
    label: 'En stock',
    color: '#5B8A00',
    bg: '#ECFCCB',
    tailwind: 'text-lime-700 bg-lime-100 border-lime-300 dark:text-blue-400 dark:bg-blue-950/50 dark:border-blue-800',
  },
  reserved: {
    label: 'Reservado',
    color: '#92600A',
    bg: '#FEF3C7',
    tailwind: 'text-amber-700 bg-amber-100 border-amber-300 dark:text-amber-400 dark:bg-amber-950/50 dark:border-amber-800',
  },
  sold: {
    label: 'Vendido',
    color: '#C25B00',
    bg: '#FFF0D9',
    tailwind: 'text-orange-700 bg-orange-100 border-orange-300 dark:text-emerald-400 dark:bg-emerald-950/50 dark:border-emerald-800',
  },
};
