import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Nfc, Link, Tag, Camera, X, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StatusBadge, TagBadge } from '../ui/Badge';
import type { Item, ItemStatus, Box } from '../../types';
import { STATUS_CONFIG } from '../../types';
import { useNFC } from '../../hooks/useNFC';
import { compressImage } from '../../utils/export';
import { useStore } from '../../store/useStore';

type ItemFormData = Omit<Item, 'id' | 'createdAt' | 'updatedAt'>;

interface ItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ItemFormData) => void;
  initialData?: Partial<Item>;
  defaultBoxId?: string;
  title?: string;
}

const INITIAL: ItemFormData = {
  name: '',
  description: '',
  boxId: '',
  nfcUid: '',
  price: 0,
  soldPrice: 0,
  status: 'stock',
  wallapopUrl: '',
  photos: [],
  tags: [],
  notes: '',
  soldAt: '',
};

export function ItemForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultBoxId,
  title = 'Nuevo objeto',
}: ItemFormProps) {
  const boxes = useStore((s) => s.boxes);
  const [form, setForm] = useState<ItemFormData>({
    ...INITIAL,
    boxId: defaultBoxId || boxes[0]?.id || '',
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isSupported, isReading, startReading, stopReading, error: nfcError } = useNFC();

  const set = <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    if (!form.boxId) e.boxId = 'Selecciona una caja';
    if (form.price < 0) e.price = 'El precio no puede ser negativo';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
    setForm({ ...INITIAL, boxId: defaultBoxId || boxes[0]?.id || '' });
    setErrors({});
    onClose();
  };

  const handleScanNFC = async () => {
    if (isReading) { stopReading(); return; }
    await startReading((uid) => { set('nfcUid', uid); stopReading(); });
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      set('tags', [...form.tags, tag]);
    }
    setTagInput('');
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingPhoto(true);
    try {
      const compressed = await Promise.all(files.map(compressImage));
      set('photos', [...form.photos, ...compressed]);
    } catch {
      // Error silencioso — el usuario puede reintentar
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const STATUSES: ItemStatus[] = ['draft', 'stock', 'reserved', 'sold'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-5 min-w-0 w-full overflow-x-hidden">

        {/* Nombre */}
        <Field label="Nombre *" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Cámara Sony, Auriculares JBL…"
            className={inputClass(!!errors.name)}
          />
        </Field>

        {/* Caja */}
        <Field label="Caja *" error={errors.boxId}>
          <select
            value={form.boxId}
            onChange={(e) => set('boxId', e.target.value)}
            className={inputClass(!!errors.boxId)}
          >
            <option value="" disabled>Selecciona una caja…</option>
            {boxes.map((box: Box) => (
              <option key={box.id} value={box.id}>{box.name}</option>
            ))}
          </select>
        </Field>

        {/* Descripción */}
        <Field label="Descripción">
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Estado, características, incluye accesorios…"
            rows={3}
            className={`${inputClass(false)} resize-none`}
          />
        </Field>

        {/* Precio */}
        <div className="grid grid-cols-2 gap-3 overflow-hidden">
          <Field label="Precio pedido (€)" error={errors.price}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">€</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price || ''}
                onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={`${inputClass(!!errors.price)} pl-7`}
              />
            </div>
          </Field>
          <Field label="Estado">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as ItemStatus)}
              className={inputClass(false)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Precio vendido (solo si sold) */}
        {form.status === 'sold' && (
          <div className="grid grid-cols-2 gap-3 overflow-hidden">
            <Field label="Precio de venta real (€)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.soldPrice || ''}
                  onChange={(e) => set('soldPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`${inputClass(false)} pl-7`}
                />
              </div>
            </Field>
            <Field label="Fecha de venta">
              <input
                type="date"
                value={form.soldAt ? form.soldAt.slice(0, 10) : ''}
                onChange={(e) => set('soldAt', e.target.value ? new Date(e.target.value).toISOString() : '')}
                className={inputClass(false)}
              />
            </Field>
          </div>
        )}

        {/* URL Wallapop */}
        <Field label="Enlace a Wallapop">
          <div className="relative">
            <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="url"
              value={form.wallapopUrl}
              onChange={(e) => set('wallapopUrl', e.target.value)}
              placeholder="https://es.wallapop.com/item/…"
              className={`${inputClass(false)} pl-8`}
            />
          </div>
        </Field>

        {/* Tags */}
        <Field label="Etiquetas / Categorías">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}}
                  placeholder="Electrónica, Ropa, Hogar…"
                  className={`${inputClass(false)} pl-8`}
                />
              </div>
              <Button type="button" variant="secondary" size="md" onClick={handleAddTag} icon={<Plus size={14} />} />
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 min-w-0 overflow-hidden">
                {form.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} onRemove={() => set('tags', form.tags.filter((t) => t !== tag))} />
                ))}
              </div>
            )}
          </div>
        </Field>

        {/* Fotos */}
        <Field label="Fotos">
          <div className="space-y-2">
            {form.photos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {form.photos.map((photo, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={photo}
                      alt={`Foto ${i + 1}`}
                      className="h-16 w-16 object-cover rounded-lg border border-surface-border"
                    />
                    <button
                      type="button"
                      onClick={() => set('photos', form.photos.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-900 text-red-300 hidden group-hover:flex items-center justify-center"
                      aria-label="Eliminar foto"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-2 text-sm text-ink-muted border border-dashed border-surface-border rounded-lg px-4 py-3 w-full hover:border-brand/50 hover:text-brand transition-colors disabled:opacity-50"
            >
              <Camera size={16} />
              {uploadingPhoto ? 'Procesando…' : 'Añadir fotos'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        </Field>

        {/* NFC UID */}
        <Field label="UID del tag NFC del objeto" help="Opcional">
          <div className="flex gap-2">
            <input
              type="text"
              value={form.nfcUid}
              onChange={(e) => set('nfcUid', e.target.value)}
              placeholder="04:AB:CD:EF…"
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
        </Field>

        {/* Notas */}
        <Field label="Notas internas">
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Observaciones, defectos, historial…"
            rows={2}
            className={`${inputClass(false)} resize-none`}
          />
        </Field>

        {/* Acciones */}
        <div className="flex gap-3 pt-2 border-t border-surface-border">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="brand" fullWidth>
            {initialData?.name ? 'Guardar cambios' : 'Crear objeto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label, children, error, help,
}: {
  label: string; children: React.ReactNode; error?: string; help?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono uppercase tracking-wider text-ink-muted block">{label}</label>
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
