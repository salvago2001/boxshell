import { useState, useCallback, useRef } from 'react';

// Declaraciones de tipos para Web NFC API (no están en lib.dom.d.ts estándar)
interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: DataView;
  encoding?: string;
  lang?: string;
}

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: NDEFMessage;
}

interface NDEFReaderEventMap {
  reading: NDEFReadingEvent;
  readingerror: Event;
}

interface NDEFReader extends EventTarget {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  write(
    message: NDEFMessageSource,
    options?: { signal?: AbortSignal; overwrite?: boolean }
  ): Promise<void>;
  addEventListener<K extends keyof NDEFReaderEventMap>(
    type: K,
    listener: (ev: NDEFReaderEventMap[K]) => void
  ): void;
  removeEventListener<K extends keyof NDEFReaderEventMap>(
    type: K,
    listener: (ev: NDEFReaderEventMap[K]) => void
  ): void;
}

type NDEFMessageSource =
  | string
  | ArrayBuffer
  | NDEFMessageInit;

interface NDEFMessageInit {
  records: NDEFRecordInit[];
}

interface NDEFRecordInit {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: string | ArrayBuffer;
}

declare const NDEFReader: {
  new (): NDEFReader;
};

// ─── Estado del hook ──────────────────────────────────────────────────────────

export interface UseNFCReturn {
  isSupported: boolean;
  isReading: boolean;
  lastUid: string | null;
  error: string | null;
  startReading: (onRead: (uid: string) => void) => Promise<void>;
  stopReading: () => void;
  writeUrl: (url: string, onSuccess?: () => void) => Promise<void>;
  isWriting: boolean;
}

/**
 * Hook para la Web NFC API.
 * Solo funciona en Android + Chrome + HTTPS.
 * Detecta disponibilidad con 'NDEFReader' in window.
 */
export function useNFC(): UseNFCReturn {
  const [isReading, setIsReading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [lastUid, setLastUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AbortController para detener el escaneo
  const abortControllerRef = useRef<AbortController | null>(null);

  // Comprueba si la API está disponible
  const isSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  /**
   * Inicia la lectura NFC. Llama onRead con el UID del tag leído.
   */
  const startReading = useCallback(
    async (onRead: (uid: string) => void) => {
      if (!isSupported) {
        setError('Web NFC no está disponible en este dispositivo o navegador.');
        return;
      }

      // Cancelar lectura anterior si la hay
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsReading(true);
      setError(null);

      try {
        const reader = new NDEFReader();
        await reader.scan({ signal: abortControllerRef.current.signal });

        reader.addEventListener('reading', (event: NDEFReadingEvent) => {
          const uid = event.serialNumber;
          setLastUid(uid);
          onRead(uid);
        });

        reader.addEventListener('readingerror', () => {
          setError('Error al leer el tag NFC. Inténtalo de nuevo.');
        });
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // Cancelación manual — no es un error real
          } else if (err.name === 'NotAllowedError') {
            setError('Permiso NFC denegado. Activa el permiso en la configuración del navegador.');
          } else if (err.name === 'NotSupportedError') {
            setError('NFC no está soportado en este dispositivo.');
          } else {
            setError(`Error NFC: ${err.message}`);
          }
        }
        setIsReading(false);
      }
    },
    [isSupported]
  );

  /**
   * Detiene la lectura NFC activa.
   */
  const stopReading = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsReading(false);
  }, []);

  /**
   * Escribe una URL en un tag NFC (para configurar nuevos tags).
   */
  const writeUrl = useCallback(
    async (url: string, onSuccess?: () => void) => {
      if (!isSupported) {
        setError('Web NFC no está disponible.');
        return;
      }

      setIsWriting(true);
      setError(null);

      try {
        const writer = new NDEFReader();
        await writer.write({
          records: [{ recordType: 'url', data: url }],
        });
        onSuccess?.();
      } catch (err) {
        if (err instanceof Error) {
          setError(`Error al escribir tag: ${err.message}`);
        }
      } finally {
        setIsWriting(false);
      }
    },
    [isSupported]
  );

  return {
    isSupported,
    isReading,
    isWriting,
    lastUid,
    error,
    startReading,
    stopReading,
    writeUrl,
  };
}
