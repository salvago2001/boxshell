import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, TrendingUp, Euro, ArchiveX, Box as BoxIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatCard, Section } from '../components/ui/Card';
import { StatusBadge, ColorBadge } from '../components/ui/Badge';
import { FAB } from '../components/ui/BottomNav';
import { BoxForm } from '../components/forms/BoxForm';
import { ItemForm } from '../components/forms/ItemForm';
import type { ItemStatus, Box, Item } from '../types';

type FilterTab = 'all' | ItemStatus;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'stock', label: 'Stock' },
  { value: 'reserved', label: 'Reservado' },
  { value: 'sold', label: 'Vendido' },
  { value: 'draft', label: 'Borrador' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { boxes, items, addBox, addItem, getStats, addToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [showBoxForm, setShowBoxForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);

  const stats = getStats();

  // Filtrar items según búsqueda y tab activo
  const filteredItems = useMemo(() => {
    let result = items;
    // El filtro de tab solo se aplica cuando no hay búsqueda activa.
    // Al buscar se muestran todos los estados para no ocultar resultados
    // cuando el tab activo no coincide con el estado del item encontrado.
    if (!searchQuery.trim() && filterTab !== 'all') {
      result = result.filter((i) => i.status === filterTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const boxMap = new Map(boxes.map((b) => [b.id, b]));
      result = result.filter((i) => {
        const box = boxMap.get(i.boxId);
        return (
          i.name.toLowerCase().includes(q) ||
          (i.description ?? '').toLowerCase().includes(q) ||
          (i.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
          box?.name.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [items, filterTab, searchQuery, boxes]);

  // Cajas con sus contadores calculados
  const boxesWithCount = useMemo(
    () =>
      boxes.map((box) => ({
        ...box,
        itemCount: items.filter((i) => i.boxId === box.id).length,
        stockCount: items.filter((i) => i.boxId === box.id && i.status === 'stock').length,
        soldCount: items.filter((i) => i.boxId === box.id && i.status === 'sold').length,
      })),
    [boxes, items]
  );

  const boxMap = useMemo(() => new Map(boxes.map((b) => [b.id, b])), [boxes]);

  const handleCreateBox = (data: Omit<Box, 'id' | 'createdAt'>) => {
    addBox(data);
    addToast('Caja creada correctamente', 'success');
  };

  const handleCreateItem = (data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
    addItem(data);
    addToast('Objeto añadido correctamente', 'success');
  };

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-surface-border px-4 pt-safe">
        <div className="max-w-lg mx-auto py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-ink">Boxshell</h1>
              <p className="text-xs font-mono text-ink-muted">
                {stats.totalBoxes} cajas · {stats.totalItems} objetos
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <BoxIcon size={18} className="text-brand" />
            </div>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar objetos, cajas, tags…"
              className="w-full bg-surface-card border border-surface-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">

        {/* Hero card — revenue summary */}
        {!isSearchActive && (
          <section>
            <HeroCard stats={stats} />
          </section>
        )}

        {/* Stats */}
        {!isSearchActive && (
          <section>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Vendidos"
                value={stats.soldItems}
                sub={`de ${stats.totalItems} totales`}
                icon={<TrendingUp size={14} />}
                accent="#EA9003"
              />
              <StatCard
                label="En stock"
                value={stats.stockItems}
                sub={`${stats.reservedItems} reservados`}
                icon={<Package size={14} />}
                accent="#A1EB09"
              />
              <StatCard
                label="Borradores"
                value={stats.draftItems}
                sub={`${stats.totalBoxes} cajas activas`}
                icon={<ArchiveX size={14} />}
                accent="#FABC1B"
              />
              <StatCard
                label="Pendiente"
                value={`${stats.pendingRevenue.toFixed(0)}€`}
                sub="por cobrar"
                icon={<Euro size={14} />}
                accent="#DBEB15"
              />
            </div>
          </section>
        )}

        {/* Cajas (solo si no hay búsqueda activa) */}
        {!isSearchActive && (
          <Section
            title="Cajas"
            action={
              <button
                onClick={() => setShowBoxForm(true)}
                className="text-xs font-mono text-brand hover:text-brand-light transition-colors"
              >
                + Nueva
              </button>
            }
          >
            {boxesWithCount.length === 0 ? (
              <EmptyState
                icon={<BoxIcon size={32} className="text-ink-faint" />}
                title="Sin cajas"
                message="Crea tu primera caja para organizar tus objetos"
                action={{ label: 'Nueva caja', onClick: () => setShowBoxForm(true) }}
              />
            ) : (
              <div className="space-y-2">
                {boxesWithCount.map((box) => (
                  <BoxCard key={box.id} box={box} onClick={() => navigate(`/box/${box.id}`)} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Filtros de objetos */}
        <Section
          title={isSearchActive ? `Resultados (${filteredItems.length})` : 'Objetos'}
          action={
            !isSearchActive ? (
              <button
                onClick={() => setShowItemForm(true)}
                className="text-xs font-mono text-brand hover:text-brand-light transition-colors"
              >
                + Nuevo
              </button>
            ) : undefined
          }
        >
          {/* Tabs de filtro */}
          {!isSearchActive && (
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1 scrollbar-none">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilterTab(tab.value)}
                  className={[
                    'shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-150',
                    filterTab === tab.value
                      ? 'bg-brand/15 text-brand border border-brand/30'
                      : 'text-ink-muted hover:text-ink border border-transparent',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<Package size={28} className="text-ink-faint" />}
              title={isSearchActive ? 'Sin resultados' : 'Sin objetos'}
              message={
                isSearchActive
                  ? `No se encontraron objetos para "${searchQuery}"`
                  : 'Añade objetos a tus cajas'
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const box = boxMap.get(item.boxId);
                return (
                  <ItemRow
                    key={item.id}
                    item={item}
                    boxName={box?.name}
                    onClick={() => navigate(`/item/${item.id}`)}
                  />
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* FAB */}
      <FAB onNewBox={() => setShowBoxForm(true)} onNewItem={() => setShowItemForm(true)} />

      {/* Formularios */}
      <BoxForm isOpen={showBoxForm} onClose={() => setShowBoxForm(false)} onSubmit={handleCreateBox} />
      <ItemForm isOpen={showItemForm} onClose={() => setShowItemForm(false)} onSubmit={handleCreateItem} />
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

import type { DashboardStats } from '../types';

function HeroCard({ stats }: { stats: DashboardStats }) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(140deg, #2D4000 0%, #3A5200 45%, #2A3D00 100%)',
        boxShadow: '0 14px 44px rgba(30,50,0,0.28), 0 0 0 1.5px rgba(140,190,0,0.28)',
      }}
    >
      {/* Lime glow blob top-right */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '-50px', right: '-50px',
          width: '220px', height: '220px',
          background: 'radial-gradient(circle, rgba(190,230,0,0.2) 0%, transparent 65%)',
        }}
      />
      {/* Bottom lime streak */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #DBEB15, #FABC1B, transparent)',
          opacity: 0.65,
        }}
      />

      {/* Label */}
      <p
        className="text-xs tracking-widest uppercase mb-2 relative"
        style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(190,230,20,0.6)' }}
      >
        Ingresos totales
      </p>

      {/* Amount */}
      <div className="relative flex items-baseline gap-0.5 mb-1">
        <span
          style={{
            fontFamily: "'Oxanium', sans-serif",
            fontSize: '3rem',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: '#ffffff',
          }}
        >
          <span style={{ fontSize: '1.4rem', color: '#DBEB15', verticalAlign: 'super', fontWeight: 600 }}>€</span>
          {stats.totalRevenue.toFixed(0)}
        </span>
      </div>

      {/* Subtitle */}
      <p
        className="text-xs relative mb-4"
        style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.38)' }}
      >
        +<strong style={{ color: '#DBEB15', fontWeight: 600 }}>{stats.pendingRevenue.toFixed(0)}€</strong> pendientes de cobro
      </p>

      {/* Chips */}
      <div className="flex flex-wrap gap-2 relative">
        {[
          { dot: '#A1EB09', label: `${stats.stockItems} en stock` },
          { dot: '#EA9003', label: `${stats.reservedItems} reservados` },
          { dot: '#FABC1B', label: `${stats.soldItems} vendidos` },
        ].map(({ dot, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
            style={{
              fontFamily: "'DM Mono', monospace",
              background: 'rgba(190,230,0,0.1)',
              border: '1px solid rgba(190,230,0,0.2)',
              color: 'rgba(220,255,100,0.75)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: dot, boxShadow: `0 0 5px ${dot}` }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function BoxCard({
  box,
  onClick,
}: {
  box: Box & { itemCount: number; stockCount: number; soldCount: number };
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-surface-card border border-surface-border rounded-xl cursor-pointer hover:border-brand/30 hover:bg-surface-elevated/50 active:scale-[0.99] transition-all duration-150"
    >
      {/* Color indicator */}
      <div
        className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center"
        style={{ backgroundColor: `${box.color}20`, border: `1.5px solid ${box.color}40` }}
      >
        <BoxIcon size={18} style={{ color: box.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-ink truncate">{box.name}</span>
          {box.location && (
            <span className="text-xs text-ink-muted shrink-0">· {box.location}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-ink-muted font-mono">{box.itemCount} objetos</span>
          {box.stockCount > 0 && (
            <span className="text-xs font-mono text-lime-700 dark:text-blue-400">{box.stockCount} en stock</span>
          )}
          {box.soldCount > 0 && (
            <span className="text-xs font-mono text-orange-700 dark:text-emerald-400">{box.soldCount} vendidos</span>
          )}
        </div>
      </div>

      <svg className="text-ink-muted shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

function ItemRow({
  item,
  boxName,
  onClick,
}: {
  item: Item;
  boxName?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 bg-surface-card border border-surface-border rounded-xl cursor-pointer hover:border-brand/30 active:scale-[0.99] transition-all duration-150"
    >
      {/* Thumbnail */}
      <div className="h-12 w-12 rounded-lg bg-surface-elevated border border-surface-border shrink-0 overflow-hidden">
        {item.photos[0] ? (
          <img src={item.photos[0]} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package size={16} className="text-ink-faint" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {boxName && <span className="text-xs text-ink-muted truncate">{boxName}</span>}
          {item.price > 0 && (
            <span className="text-xs font-mono text-ink-muted">{item.price}€</span>
          )}
        </div>
      </div>

      <StatusBadge status={item.status} size="sm" />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center py-10 gap-3 text-center">
      {icon}
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-xs text-ink-muted mt-1">{message}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-mono text-brand hover:text-brand-light border border-brand/30 rounded-lg px-4 py-2 transition-colors mt-1"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
