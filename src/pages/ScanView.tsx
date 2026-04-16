import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Nfc, Camera, Copy, Check, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { useNFC } from '../hooks/useNFC';
import { useQR } from '../hooks/useQR';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { BoxForm } from '../components/forms/BoxForm';
import { ItemForm } from '../components/forms/ItemForm';
import { AppHeader } from '../components/ui/AppHeader';
import type { Box, Item } from '../types';

type ScanMode = 'nfc' | 'qr';
type ScanResult = { uid: string; found: boolean; type?: 'box' | 'item'; targetId?: string } | null;

const QR_ELEMENT_ID = 'qr-reader';

export function ScanView() {
  const navigate = useNavigate();
  const { findByNfcUid, addBox, addItem, addToast } = useStore();

  const [mode, setMode] = useState<ScanMode>('nfc');
  const [result, setResult] = useState<ScanResult>(null);
  const [copied, setCopied] = useState(false);
  const [showBoxForm, setShowBoxForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const pendingUidRef = useRef<string>('');

  const { isSupported: nfcSupported, isReading, startReading, stopReading, error: nfcError } = useNFC();
  const { isScanning, startScanning, stopScanning, error: qrError } = useQR();

  // (No forzar QR cuando NFC no está disponible: mostramos instrucciones en la pestaña NFC)

  const handleScanResult = useCallback(
    (uid: string) => {
      const lookup = findByNfcUid(uid);
      if (lookup) {
        setResult({ uid, found: true, type: lookup.type, targetId: lookup.id });
        // Navegar automáticamente después de 1 segundo
        setTimeout(() => {
          navigate(`/${lookup.type === 'box' ? 'box' : 'item'}/${lookup.id}`);
        }, 900);
      } else {
        setResult({ uid, found: false });
        pendingUidRef.current = uid;
      }
    },
    [findByNfcUid, navigate]
  );

  // ── NFC ──────────────────────────────────────────────────────────────────────

  const startNFC = useCallback(async () => {
    setResult(null);
    await startReading(handleScanResult);
  }, [startReading, handleScanResult]);

  // ── QR ───────────────────────────────────────────────────────────────────────

  const startQR = useCallback(async () => {
    setResult(null);
    await startScanning(QR_ELEMENT_ID, handleScanResult);
  }, [startScanning, handleScanResult]);

  const stopAll = useCallback(() => {
    stopReading();
    stopScanning();
    setResult(null);
  }, [stopReading, stopScanning]);

  // Iniciar escaneo al cambiar de modo
  useEffect(() => {
    stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const isActive = isReading || isScanning;
  const error = nfcError || qrError;

  const handleCopy = () => {
    if (!result?.uid) return;
    navigator.clipboard.writeText(result.uid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCreateBox = (data: Omit<Box, 'id' | 'createdAt'>) => {
    const box = addBox({ ...data, nfcUid: pendingUidRef.current });
    addToast('Caja creada y tag NFC asignado', 'success');
    navigate(`/box/${box.id}`);
  };

  const handleCreateItem = (data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
    const item = addItem({ ...data, nfcUid: pendingUidRef.current });
    addToast('Objeto creado y tag NFC asignado', 'success');
    navigate(`/item/${item.id}`);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-20">
      <AppHeader showBack title="Escanear" />

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-6">

        {/* Selector de modo — siempre visible */}
        <div className="flex gap-2 p-1 bg-surface-card border border-surface-border rounded-xl">
          {(['nfc', 'qr'] as ScanMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={[
                'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-all duration-150',
                mode === m
                  ? 'bg-brand text-white'
                  : 'text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              {m === 'nfc' ? <Nfc size={15} /> : <Camera size={15} />}
              {m === 'nfc' ? 'NFC' : 'QR / Cámara'}
            </button>
          ))}
        </div>

        {/* Área de escaneo */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {mode === 'nfc' ? (
            nfcSupported ? (
              <NFCScanArea
                isReading={isReading}
                onStart={startNFC}
                onStop={stopAll}
                error={error}
              />
            ) : (
              <NFCInstructionsArea />
            )
          ) : (
            <QRScanArea
              isScanning={isScanning}
              onStart={startQR}
              onStop={stopAll}
              error={error}
            />
          )}

          {/* Resultado */}
          {result && (
            <div
              className={[
                'w-full p-4 rounded-xl border animate-slide-up',
                result.found
                  ? 'bg-emerald-950/40 border-emerald-800/50'
                  : 'bg-amber-950/40 border-amber-800/50',
              ].join(' ')}
            >
              {result.found ? (
                <div className="text-center space-y-2">
                  <p className="text-emerald-400 text-sm font-medium">
                    ¡{result.type === 'box' ? 'Caja' : 'Objeto'} encontrado!
                  </p>
                  <p className="text-xs text-emerald-400/60 font-mono">Redirigiendo…</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 text-sm font-medium">Tag no registrado</p>
                      <p className="text-xs text-amber-400/60 mt-0.5">
                        UID: <span className="font-mono">{result.uid}</span>
                      </p>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="ml-auto shrink-0 text-amber-400/70 hover:text-amber-400 transition-colors"
                      aria-label="Copiar UID"
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                  <p className="text-xs text-ink-muted">¿Qué quieres hacer con este tag?</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      icon={<Plus size={13} />}
                      onClick={() => setShowBoxForm(true)}
                    >
                      Nueva caja
                    </Button>
                    <Button
                      size="sm"
                      variant="brand"
                      fullWidth
                      icon={<Plus size={13} />}
                      onClick={() => setShowItemForm(true)}
                    >
                      Nuevo objeto
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Descripción de uso */}
        {!isActive && !result && mode === 'qr' && (
          <div className="text-center space-y-1">
            <p className="text-xs text-ink-muted">Apunta la cámara al código QR de un objeto o caja</p>
          </div>
        )}
        {!isActive && !result && mode === 'nfc' && nfcSupported && (
          <div className="text-center space-y-1">
            <p className="text-xs text-ink-muted">Acerca el móvil al tag NFC de una caja u objeto</p>
          </div>
        )}
      </div>

      {/* Formularios */}
      <BoxForm
        isOpen={showBoxForm}
        onClose={() => setShowBoxForm(false)}
        onSubmit={handleCreateBox}
        initialData={{ nfcUid: pendingUidRef.current }}
        title="Nueva caja con este tag"
      />
      <ItemForm
        isOpen={showItemForm}
        onClose={() => setShowItemForm(false)}
        onSubmit={handleCreateItem}
        title="Nuevo objeto con este tag"
      />
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function NFCInstructionsArea() {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xs text-center">
      <div className="h-32 w-32 rounded-full bg-surface-card border-2 border-surface-border flex items-center justify-center">
        <Nfc size={48} className="text-ink-faint" />
      </div>
      <div className="space-y-3 w-full">
        <p className="text-sm font-medium text-ink">NFC no disponible en este dispositivo</p>
        <p className="text-xs text-ink-muted">
          Web NFC solo funciona en Chrome para Android.
          Usa <span className="font-medium text-ink">NFC Tools</span> para programar los tags manualmente.
        </p>
        <div className="text-left bg-surface-card border border-surface-border rounded-xl p-4 space-y-1.5 text-xs text-ink-muted">
          <p className="font-medium text-ink mb-2">Cómo programar un tag con NFC Tools:</p>
          <p>1. Abre la caja que quieres etiquetar en la app</p>
          <p>2. Copia la <span className="font-medium text-ink">URL NFC</span> que aparece en los datos de la caja</p>
          <p>3. En NFC Tools → <span className="font-medium text-ink">Write</span> → <span className="font-medium text-ink">Add a record</span> → URL</p>
          <p>4. Pega la URL y pulsa <span className="font-medium text-ink">Write / OK</span></p>
          <p>5. Al escanear el tag, la app abre directamente esa caja</p>
        </div>
      </div>
    </div>
  );
}

function NFCScanArea({
  isReading, onStart, onStop, error,
}: { isReading: boolean; onStart: () => void; onStop: () => void; error: string | null }) {
  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Animación */}
      <div className="relative flex items-center justify-center h-48 w-48">
        {isReading && (
          <>
            <div className="absolute h-full w-full rounded-full border-2 border-brand/30 animate-pulse-ring" />
            <div className="absolute h-3/4 w-3/4 rounded-full border border-brand/20 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
          </>
        )}
        <div
          className={[
            'h-32 w-32 rounded-full flex items-center justify-center transition-all duration-300',
            isReading
              ? 'bg-brand/15 border-2 border-brand/50 shadow-glow-brand'
              : 'bg-surface-card border-2 border-surface-border',
          ].join(' ')}
        >
          <Nfc size={48} className={isReading ? 'text-brand' : 'text-ink-muted'} />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl p-3 text-sm max-w-xs text-center">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <Button
        variant={isReading ? 'danger' : 'brand'}
        size="lg"
        icon={isReading ? <RefreshCw size={18} className="animate-spin" /> : <Nfc size={18} />}
        onClick={isReading ? onStop : onStart}
      >
        {isReading ? 'Detener' : 'Iniciar escaneo NFC'}
      </Button>
    </div>
  );
}

function QRScanArea({
  isScanning, onStart, onStop, error,
}: { isScanning: boolean; onStart: () => void; onStop: () => void; error: string | null }) {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Contenedor de la cámara */}
      <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden bg-surface-card border-2 border-surface-border">
        <div id={QR_ELEMENT_ID} className="w-full h-full" />

        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-card">
            <Camera size={40} className="text-ink-faint" />
            <p className="text-xs text-ink-muted font-mono">Cámara inactiva</p>
          </div>
        )}

        {/* Marco de escaneo */}
        {isScanning && (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 h-6 w-6 border-t-2 border-l-2 border-brand rounded-tl-lg" />
              <div className="absolute top-4 right-4 h-6 w-6 border-t-2 border-r-2 border-brand rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-brand rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-brand rounded-br-lg" />
            </div>
            <div className="absolute top-0 left-4 right-4 h-0.5 bg-brand/70 animate-scan-line" />
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl p-3 text-sm max-w-xs">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <Button
        variant={isScanning ? 'danger' : 'brand'}
        size="lg"
        icon={isScanning ? <RefreshCw size={18} className="animate-spin" /> : <Camera size={18} />}
        onClick={isScanning ? onStop : onStart}
      >
        {isScanning ? 'Detener cámara' : 'Activar cámara QR'}
      </Button>
    </div>
  );
}
