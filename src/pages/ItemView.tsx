import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, ExternalLink, Box as BoxIcon,
  Nfc, ChevronLeft, ChevronRight, Package, MoveRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge, TagBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmModal, Modal } from '../components/ui/Modal';
import { ItemForm } from '../components/forms/ItemForm';
import { STATUS_CONFIG, type ItemStatus, type Item } from '../types';

const STATUSES: ItemStatus[] = ['draft', 'stock', 'reserved', 'sold'];

export function ItemView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getItem, getBox, boxes, updateItem, deleteItem, moveItem, addToast } = useStore();

  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const item = getItem(id!);
  const box = item ? getBox(item.boxId) : undefined;

  if (!item) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-3">
          <Package size={32} className="text-ink-faint mx-auto" />
          <p className="text-ink-muted text-sm">Objeto no encontrado</p>
          <button onClick={() => navigate('/')} className="text-brand text-sm hover:underline">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    deleteItem(item.id);
    addToast('Objeto eliminado', 'success');
    navigate(-1);
  };

  const handleStatusChange = (status: ItemStatus) => {
    const updates: Partial<Item> = { status };
    if (status === 'sold' && !item.soldAt) {
      updates.soldAt = new Date().toISOString();
    }
    if (status !== 'sold') {
      updates.soldPrice = 0;
      updates.soldAt = '';
    }
    updateItem(item.id, updates);
    addToast(`Estado actualizado: ${STATUS_CONFIG[status].label}`, 'success');
  };

  const handleMove = (newBoxId: string) => {
    moveItem(item.id, newBoxId);
    addToast('Objeto movido a otra caja', 'success');
    setShowMoveModal(false);
  };

  const handleUpdate = (data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
    updateItem(item.id, data);
    addToast('Objeto actualizado', 'success');
  };

  const hasPhotos = item.photos.length > 0;
  const safePhotoIndex = Math.min(photoIndex, item.photos.length - 1);

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-surface-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-surface-card transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 text-base font-display font-bold text-ink truncate">{item.name}</h1>
          <div className="flex gap-1">
            <button
              onClick={() => setShowEditForm(true)}
              className="h-9 w-9 flex items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-surface-card transition-all"
              aria-label="Editar"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="h-9 w-9 flex items-center justify-center rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-950/30 transition-all"
              aria-label="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* Galería de fotos */}
        <div className="relative bg-surface-card border-b border-surface-border" style={{ height: 260 }}>
          {hasPhotos ? (
            <>
              <img
                src={item.photos[safePhotoIndex]}
                alt={`${item.name} foto ${safePhotoIndex + 1}`}
                className="h-full w-full object-contain"
              />
              {item.photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                    disabled={safePhotoIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setPhotoIndex((i) => Math.min(item.photos.length - 1, i + 1))}
                    disabled={safePhotoIndex === item.photos.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {item.photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${
                          i === safePhotoIndex ? 'w-5 bg-brand' : 'w-1.5 bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-ink-faint">
              <Package size={40} />
              <span className="text-xs font-mono">Sin fotos</span>
            </div>
          )}
        </div>

        <div className="px-4 py-5 space-y-6">
          {/* Info principal */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-xl font-display font-bold text-ink">{item.name}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {item.price > 0 && (
                  <span className="text-xl font-display font-bold text-brand">
                    {item.price}€
                  </span>
                )}
              </div>
            </div>
            {item.description && (
              <p className="text-sm text-ink-muted leading-relaxed">{item.description}</p>
            )}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {item.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
              </div>
            )}
          </div>

          {/* Selector de estado */}
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-ink-muted block mb-3">
              Estado
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => {
                const config = STATUS_CONFIG[s];
                const isActive = item.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={[
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150',
                      isActive
                        ? `${config.tailwind} scale-[1.02]`
                        : 'border-surface-border text-ink-muted hover:border-brand/30 hover:text-ink',
                    ].join(' ')}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: isActive ? config.color : '#374151' }}
                    />
                    {config.label}
                  </button>
                );
              })}
            </div>

            {/* Precio de venta / fecha si está vendido */}
            {item.status === 'sold' && (
              <div className="mt-3 p-3 bg-emerald-950/30 border border-emerald-800/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-400/70 font-mono text-xs uppercase tracking-wider">Vendido por</span>
                  <span className="font-display font-bold text-emerald-400">
                    {item.soldPrice > 0 ? `${item.soldPrice}€` : 'Sin precio registrado'}
                  </span>
                </div>
                {item.soldAt && (
                  <div className="flex items-center justify-between text-xs text-emerald-400/60 font-mono">
                    <span>Fecha</span>
                    <span>{new Date(item.soldAt).toLocaleDateString('es-ES')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Caja contenedora */}
          {box && (
            <div>
              <label className="text-xs font-mono uppercase tracking-widest text-ink-muted block mb-2">
                Caja
              </label>
              <Link
                to={`/box/${box.id}`}
                className="flex items-center gap-3 p-3 bg-surface-card border border-surface-border rounded-xl hover:border-brand/30 transition-all group"
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${box.color}20`, border: `1px solid ${box.color}40` }}
                >
                  <BoxIcon size={16} style={{ color: box.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{box.name}</p>
                  {box.location && (
                    <p className="text-xs text-ink-muted">{box.location}</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-ink-muted group-hover:text-ink transition-colors" />
              </Link>

              <button
                onClick={() => setShowMoveModal(true)}
                className="mt-2 flex items-center gap-1.5 text-xs font-mono text-ink-muted hover:text-brand transition-colors"
              >
                <MoveRight size={12} />
                Mover a otra caja
              </button>
            </div>
          )}

          {/* Wallapop */}
          {item.wallapopUrl && (
            <a
              href={item.wallapopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-surface-card border border-surface-border rounded-xl hover:border-brand/30 transition-all group"
            >
              <div className="h-9 w-9 rounded-lg bg-[#13C2A6]/10 border border-[#13C2A6]/20 flex items-center justify-center shrink-0">
                <ExternalLink size={15} className="text-[#13C2A6]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">Ver en Wallapop</p>
                <p className="text-xs text-ink-muted truncate">{item.wallapopUrl}</p>
              </div>
              <ExternalLink size={14} className="text-ink-muted group-hover:text-ink" />
            </a>
          )}

          {/* Detalles técnicos */}
          {(item.nfcUid || item.notes) && (
            <div className="space-y-3">
              {item.nfcUid && (
                <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
                  <Nfc size={13} />
                  <span>NFC: </span>
                  <span className="text-ink">{item.nfcUid}</span>
                </div>
              )}
              {item.notes && (
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">Notas</p>
                  <p className="text-sm text-ink-muted bg-surface-elevated border border-surface-border rounded-lg p-3 leading-relaxed">
                    {item.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="pt-2 border-t border-surface-border text-xs font-mono text-ink-muted space-y-1">
            <div className="flex justify-between">
              <span>Creado</span>
              <span>{new Date(item.createdAt).toLocaleDateString('es-ES')}</span>
            </div>
            <div className="flex justify-between">
              <span>Actualizado</span>
              <span>{new Date(item.updatedAt).toLocaleDateString('es-ES')}</span>
            </div>
            <div className="flex justify-between">
              <span>ID</span>
              <span className="text-ink-faint">{item.id.slice(0, 8)}…</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para mover de caja */}
      <Modal isOpen={showMoveModal} onClose={() => setShowMoveModal(false)} title="Mover a otra caja" size="sm">
        <div className="p-4 space-y-2">
          {boxes
            .filter((b) => b.id !== item.boxId)
            .map((b) => (
              <button
                key={b.id}
                onClick={() => handleMove(b.id)}
                className="w-full flex items-center gap-3 p-3 bg-surface-elevated border border-surface-border rounded-xl hover:border-brand/30 text-left transition-all"
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="text-sm text-ink">{b.name}</span>
                {b.location && <span className="text-xs text-ink-muted ml-auto">{b.location}</span>}
              </button>
            ))}
          {boxes.filter((b) => b.id !== item.boxId).length === 0 && (
            <p className="text-sm text-ink-muted text-center py-4">No hay otras cajas disponibles</p>
          )}
        </div>
      </Modal>

      {/* Formulario editar */}
      <ItemForm
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleUpdate}
        initialData={item}
        title="Editar objeto"
      />

      {/* Confirmar borrar */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Eliminar objeto"
        message={`¿Seguro que quieres eliminar "${item.name}"?`}
        confirmLabel="Eliminar"
        danger
      />
    </div>
  );
}
