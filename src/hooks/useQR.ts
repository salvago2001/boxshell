import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseQRReturn {
  isScanning: boolean;
  error: string | null;
  startScanning: (elementId: string, onScan: (result: string) => void) => Promise<void>;
  stopScanning: () => void;
}

/**
 * Hook para escanear códigos QR con la cámara del dispositivo.
 * Usa html5-qrcode como fallback cuando Web NFC no está disponible.
 */
export function useQR(): UseQRReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guardamos la instancia del escáner para poder detenerlo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  // Limpiar al desmontar el componente
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const startScanning = useCallback(
    async (elementId: string, onScan: (result: string) => void) => {
      setError(null);
      setIsScanning(true);

      try {
        // Importación dinámica para no cargar la librería si no se usa
        const { Html5Qrcode } = await import('html5-qrcode');

        // Detener escáner previo si existe
        if (scannerRef.current) {
          await scannerRef.current.stop().catch(() => {});
          await scannerRef.current.clear().catch(() => {});
        }

        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' }, // cámara trasera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            // Éxito: extraer ID si es una URL de BoxSell
            const extracted = extractIdFromUrl(decodedText);
            onScan(extracted || decodedText);
          },
          () => {
            // Error de frame — ignorar (ocurre continuamente mientras busca)
          }
        );
      } catch (err) {
        setIsScanning(false);
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.message.includes('permission')) {
            setError('Permiso de cámara denegado. Activa la cámara en tu navegador.');
          } else if (err.message.includes('NotFound') || err.message.includes('OverconstrainedError')) {
            setError('No se encontró una cámara disponible.');
          } else {
            setError(`Error al iniciar cámara: ${err.message}`);
          }
        } else {
          setError('Error desconocido al iniciar el escáner QR.');
        }
      }
    },
    []
  );

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // Ignorar errores al detener
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setError(null);
  }, []);

  return { isScanning, error, startScanning, stopScanning };
}

/**
 * Extrae el ID de una URL de BoxSell.
 * Formatos soportados:
 *   - https://dominio.com/?id=UUID
 *   - https://dominio.com/item/UUID
 *   - https://dominio.com/box/UUID
 */
function extractIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Formato ?id=UUID
    const idParam = parsed.searchParams.get('id');
    if (idParam) return idParam;

    // Formato /item/UUID o /box/UUID
    const pathMatch = parsed.pathname.match(/\/(item|box)\/([a-f0-9-]{36})/i);
    if (pathMatch) return pathMatch[2];

    return null;
  } catch {
    return null;
  }
}
