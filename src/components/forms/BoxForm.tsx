import { useState, type FormEvent } from 'react';
import { Nfc, MapPin } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { BOX_COLORS, type Box } from '../../types';
import { useNFC } from '../../hooks/useNFC';

interface BoxFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Box, 'id' | 'createdAt'>) => void;
  initialData?: Partial<Box>;
  title?: string;
}

const INITIAL: Omit<Box, 'id' | 'createdAt'> = {
  name: '',
  description: '',
  location: '',
  color: BOX_COLORS[0],
  nfcUid: '',
};

export function BoxForm({ isOpen, onClose, onSubmit, initialData, title = 'Nueva caja' }: BoxFormProps) {
  const [form, setForm] = useState<Omit<Box, 'id' | 'createdAt'>>({ ...INITIAL, ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { isSupported, isReading, startReading, stopReading, error: nfcError } = useNFC();

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
    setForm({ ...INITIAL, ...initialData });
    setErrors({});
    onClose();
  };

  const handleScanNFC = async () => {
    if (isReading) {
      stopReading();
      return;
    }
    await startReading((uid) => {
      set('nfcUid', uid);
      stopReading();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">

        {/* Nombre */}
        <Field label="Nombre *" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Caja A, Electrónica 1…"
            className={inputClass(!!errors.name)}
          />
        </Field>

        {/* Descripción */}
        <Field label="Descripción">
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Contenido general de la caja…"
            rows={2}
            className={`${inputClass(false)} resize-none`}
          />
        </Field>

        {/* Ubicación */}
        <Field label="Ubicación">
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Trastero, Salón, Garaje…"
              className={`${inputClass(false)} pl-8`}
            />
          </div>
        </Field>

        {/* Color */}
        <Field label="Color de etiqueta">
          <div className="flex flex-wrap gap-2">
            {BOX_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => set('color', color)}
                className={[
                  'h-7 w-7 rounded-full transition-all duration-150',
                  form.color === color ? 'ring-2 ring-offset-2 ring-offset-surface-card ring-white scale-110' : 'hover:scale-105',
                ].join(' ')}
                style={{ backgroundColor: color }}
                aria-label={`Color ${color}`}
              />
            ))}
          </div>
        </Field>

        {/* NFC UID */}
        <Field label="UID del tag NFC" help="Opcional — puedes dejarlo vacío si no tienes tag">
          <div className="flex gap-2">
            <input
              type="text"
              value={form.nfcUid}
              onChange={(e) => set('nfcUid', e.target.value)}
              placeholder="04:AB:CD:EF o escanearlo"
              className={`${inputClass(false)} font-mono text-sm flex-1`}
            />
            {isSupported && (
              <Button
                type="button"
                variant={isReading ? 'brand' : 'secondary'}
                size="md"
                onClick={handleScanNFC}
                icon={<Nfc size={16} />}
              >
                {isReading ? 'Leyendo…' : 'NFC'}
              </Button>
            )}
          </div>
          {nfcError && <p className="text-xs text-red-400 mt-1">{nfcError}</p>}
          {!isSupported && (
            <p className="text-xs text-ink-muted mt-1">
              Web NFC no disponible — escribe el UID manualmente o usa la app NFC Tools.
            </p>
          )}
        </Field>

        {/* Acciones */}
        <div className="flex gap-3 pt-2 border-t border-surface-border">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="brand" fullWidth>
            {initialData?.name ? 'Guardar cambios' : 'Crear caja'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Helpers de formulario ────────────────────────────────────────────────────

function Field({
  label,
  children,
  error,
  help,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  help?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono uppercase tracking-wider text-ink-muted block">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {help && !error && <p className="text-xs text-ink-muted">{help}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    'w-full bg-surface-elevated border rounded-lg px-3 py-2.5 text-sm text-ink',
    'placeholder:text-ink-faint focus:outline-none focus:ring-2 transition-all duration-150',
    hasError
      ? 'border-red-800 focus:ring-red-500/30'
      : 'border-surface-border focus:ring-brand/30 focus:border-brand/50',
  ].join(' ');
}
