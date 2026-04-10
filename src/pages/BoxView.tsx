import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Package, MapPin, Nfc, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/Modal';
import { BoxForm } from '../components/forms/BoxForm';
import { ItemForm } from '../components/forms/ItemForm';
import type { Box, Item } from '../types';
import { useNavigate as useNav } from 'react-router-dom';

export function BoxView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getBox, getBoxItems, updateBox, deleteBox, addItem, addToast } = useStore();

  const [showEditForm, setShowEditForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const box = getBox(id!);
  const items = getBoxItems(id!);

  if (!box) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-muted text-sm">Caja no encontrada</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-brand text-sm hover:underline"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const handleDeleteBox = () => {
    const deleted = deleteBox(box.id);
    if (deleted) {
      addToast('Caja eliminada', 'success');
      navigate('/');
    } else {
      addToast('No se puede eliminar una caja con objetos', 'error');
    }
  };

  const handleUpdateBox = (data: Omit<Box, 'id' | 'createdAt'>) => {
    updateBox(box.id, data);
    addToast('Caja actualizada', 'success');
  };

  const handleAddItem = (data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
    addItem({ ...data, boxId: box.id });
    addToast('Objeto añadido', 'success');
  };

  const stockCount = items.filter((i) => i.status === 'stock').length;
  const soldCount = items.filter((i) => i.status === 'sold').length;

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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: box.color }}
              />
              <h1 className="text-base font-display font-bold text-ink truncate">{box.name}</h1>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowEditForm(true)}
              className="h-9 w-9 flex items-center justify-center rounded-xl text-ink-muted hover:text-ink hover:bg-surface-card transition-all"
              aria-label="Editar caja"
            >
              <Edit2 size={16} />
            </button>
            {items.length === 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-950/30 transition-all"
                aria-label="Eliminar caja"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {/* Info de la caja */}
        <div
          className="rounded-xl border p-5"
          style={{
            backgroundColor: `${box.color}08`,
            borderColor: `${box.color}30`,
          }}
        >
          {box.description && (
            <p className="text-sm text-ink-muted mb-3">{box.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-xs font-mono text-ink-muted">
            {box.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} />
                {box.location}
              </span>
            )}
            {box.nfcUid && (
              <span className="flex items-center gap-1.5">
                <Nfc size={12} />
                {box.nfcUid}
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs font-mono">
            <span className="text-ink-muted">{items.length} objetos</span>
            {stockCount > 0 && <span className="text-blue-400">{stockCount} en stock</span>}
            {soldCount > 0 && <span className="text-emerald-400">{soldCount} vendidos</span>}
          </div>
        </div>

        {/* Botón añadir objeto */}
        <Button
          variant="secondary"
          fullWidth
          icon={<Plus size={16} />}
          onClick={() => setShowItemForm(true)}
        >
          Añadir objeto a esta caja
        </Button>

        {/* Grid de objetos */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <Package size={32} className="text-ink-faint" />
            <p className="text-sm text-ink-muted">Esta caja está vacía</p>
            <button
              onClick={() => setShowItemForm(true)}
              className="text-xs font-mono text-brand border border-brand/30 rounded-lg px-4 py-2"
            >
              + Añadir primer objeto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Formularios y confirmaciones */}
      <BoxForm
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleUpdateBox}
        initialData={box}
        title="Editar caja"
      />
      <ItemForm
        isOpen={showItemForm}
        onClose={() => setShowItemForm(false)}
        onSubmit={handleAddItem}
        defaultBoxId={box.id}
        title="Añadir objeto"
      />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteBox}
        title="Eliminar caja"
        message={`¿Seguro que quieres eliminar la caja "${box.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />
    </div>
  );
}

function ItemCard({ item }: { item: Item }) {
  const navigate = useNav();
  return (
    <div
      onClick={() => navigate(`/item/${item.id}`)}
      className="bg-surface-card border border-surface-border rounded-xl overflow-hidden cursor-pointer hover:border-brand/30 active:scale-[0.98] transition-all duration-150"
    >
      {/* Thumbnail */}
      <div className="h-28 bg-surface-elevated">
        {item.photos[0] ? (
          <img
            src={item.photos[0]}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package size={24} className="text-ink-faint" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-xs font-medium text-ink leading-tight line-clamp-2">{item.name}</p>
        <div className="flex items-center justify-between">
          {item.price > 0 ? (
            <span className="text-xs font-mono text-ink-muted">{item.price}€</span>
          ) : (
            <span />
          )}
          <StatusBadge status={item.status} size="sm" />
        </div>
      </div>
    </div>
  );
}
