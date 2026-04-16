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
        <div className="max-w-lg mx-auto py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Logo SVG ámbar */}
              <svg viewBox="0 0 609.37 703.84" className="h-9 w-auto" aria-hidden="true" style={{ fill: '#F59E0B' }}>
                <path d="M.09,350.91v-148c0-7.67.36-15.34.11-23-.18-5.21,2.07-8.35,6.4-10.82q36-20.53,71.94-41.3Q134,95.89,189.38,63.91c35.08-20.2,70.28-40.18,105.17-60.7,7.19-4.23,12.61-4.32,19.93,0,42,24.59,84.24,48.63,126.42,72.86q80.6,46.29,161.22,92.56c5,2.89,7.26,6.58,7.25,12.48q-.18,96.48,0,193,0,74.25-.1,148.49c0,5.06-2,8.36-6.42,10.88q-74.21,42.84-148.33,85.87c-47.14,27.28-94.37,54.42-141.41,81.88-6.15,3.59-11,3.4-17-.11-43.75-25.47-87.71-50.61-131.52-76q-62.06-35.94-124-72.08c-11.15-6.45-22.28-12.84-33.48-19C2,531.14,0,527.2,0,521.36q.33-73.5.33-147V350.87Zm101.42,0h-.12c0,37.82.07,75.65-.1,113.47,0,4.45,1.49,6.84,5.32,9q41.56,23.4,82.92,47.19,55.07,31.53,110,63.26c3.86,2.23,6.81,2.34,10.46-.13,4.27-2.88,8.9-5.23,13.38-7.8q88.9-50.85,177.86-101.6c4.76-2.7,6.81-5.49,6.79-11.2q-.39-113-.19-225.94c0-3.66-1.63-5.4-4.43-7-13.63-7.69-27.26-15.39-40.82-23.21Q386,162.79,309.47,118.49c-3.48-2-6.08-2-9.51,0q-37.29,21.83-74.79,43.32-59.78,34.35-119.64,68.55c-2.43,1.39-4.11,2.71-4.1,6,.13,38.18.08,76.34.08,114.49Zm491.8,160.54V192.36a29.86,29.86,0,0,0-3.37,1.39c-21.08,12.13-42.12,24.32-63.24,36.36-2.81,1.59-3.29,3.67-3.29,6.55q.12,115,.27,230a8,8,0,0,0,3.23,5.8c19.94,12.09,40,23.92,60.1,35.79,1.8,1,3.72,1.88,6.3,3.19Zm-577.46-.22a36.29,36.29,0,0,0,3.47-1.45c21.12-12.38,42.28-24.72,63.26-37.34,1.66-1,2.94-4,3-6,.29-10.82.1-21.66.11-32.49q0-98,.21-196c0-4.43-1.5-6.94-5.31-9.09C65.06,220.07,49.72,211,34.27,202.1c-5.83-3.36-11.74-6.58-18.42-10.3ZM312.37,683.75,584.7,525.87a33.19,33.19,0,0,0-3.5-3C560.11,510.46,539,498,517.82,485.78c-1.33-.77-3.88-.52-5.34.25-6.05,3.16-11.88,6.72-17.81,10.11q-89.1,51-178.26,102c-3.08,1.76-4.07,3.73-4.05,7.1.1,22.83,0,45.67,0,68.5ZM23.77,525.32l273,158.22v-6.67c0-23.49-.1-47,.15-70.47.05-4.47-1.45-6.84-5.27-9q-66-37.53-131.83-75.37Q129,504.39,98.34,486.64c-3.07-1.79-5.52-1.89-8.68,0-11.56,6.94-23.35,13.52-35,20.32C44.81,512.74,35,518.65,23.77,525.32ZM313.13,20.76a23.21,23.21,0,0,0-.6,2.87c0,25.16-.12,50.32.14,75.48,0,1.84,2.19,4.34,4,5.4,22.47,13,45.09,25.81,67.61,38.77q63.44,36.48,126.79,73.14c2.77,1.61,5,1.8,7.79.14,20-11.7,40-23.25,60-34.89,1.82-1.06,3.5-2.36,6.24-4.24ZM24.07,177.6c2.69,1.76,4.41,3,6.24,4.05C50,193.09,69.85,204.42,89.48,216c3.36,2,5.7,1.93,9,0q52.77-30.51,105.74-60.68,44.22-25.32,88.5-50.56c2.65-1.52,4.21-3.07,4.18-6.53-.2-24-.14-48-.19-72,0-1.55-.21-3.1-.38-5.61Z"/>
                <path d="M484.53,352.46c0,33.16-.08,66.33.1,99.49,0,5-2.93,7.11-6.43,9.13q-20.77,12-41.59,23.91c-41.35,23.66-82.75,47.21-124,71-5.77,3.33-10.47,3.28-16.17,0q-81.37-46.95-163-93.46c-6.44-3.66-8.85-7.83-8.81-15.41q.47-95.76,0-191.49c0-6.59,2.08-11,7.88-14.23,25.27-14.19,50.42-28.6,75.59-43,28.07-16,56.31-31.74,84.09-48.24,8.49-5,15-5.77,24-.53,52.73,30.58,105.83,60.54,159,90.43,6.83,3.84,9.62,8.52,9.55,16.32-.3,32-.13,64-.13,96Zm-344.19,1.27v7c0,27.17.1,54.33-.13,81.49,0,4.62,1.46,7.15,5.45,9.42q73.18,41.63,146.22,83.52c1.23.71,2.59,1.18,4.63,2.09.11-2.48.26-4.24.26-6,0-27.16-.1-54.33.15-81.49.05-4.87-1.64-7.5-5.73-9.82q-65-36.9-129.75-74c-6.6-3.82-13.18-7.64-21.1-12.21Zm258.32-68.42c-2.6-1.72-4.28-3-6.09-4-27.6-15.77-55.26-31.45-82.77-47.37-3.66-2.13-6.36-2.15-10-.07-27.71,15.91-55.54,31.62-83.31,47.42-1.79,1-3.44,2.28-5.7,3.8,1.93,1.31,3.08,2.21,4.34,2.93q42.93,24.5,85.85,49c3,1.71,5.09,1.2,7.73-.31q38.37-22,76.8-43.75C389.66,290.61,393.75,288.18,398.66,285.31Zm8.45,14c-1.77.82-2.69,1.18-3.54,1.66q-43.38,24.75-86.79,49.46c-3.18,1.8-4.34,3.87-4.31,7.49.14,20.15,0,40.31,0,60.47,0,1.73.18,3.46.31,5.93,2.21-1.08,3.7-1.72,5.1-2.51q42.92-24.56,85.86-49.07c3.11-1.76,3.87-4.06,3.85-7.33-.09-20.16,0-40.32-.06-60.47,0-1.64-.22-3.25-.42-5.66ZM296.5,424.62c.13-2.7.28-4.3.28-5.91,0-20.15-.08-40.31.13-60.46,0-3.86-1.23-6-4.55-7.9q-37-20.88-73.76-42.06c-5.17-3-10.33-5.92-16-9.17a34.21,34.21,0,0,0-.65,4.41c0,20.82,0,41.65-.13,62.47,0,3.55,1.49,5.37,4.37,7,17.8,10.12,35.52,20.39,53.29,30.57C271.44,410.44,283.45,417.21,296.5,424.62Zm79.77-17.35c-3.47,1.69-5.91,2.72-8.19,4-17.38,9.87-34.68,19.83-52.08,29.6-3,1.66-3.6,3.79-3.59,6.9.1,27.81.06,55.62.07,83.43v6.23c2.49-1.11,4.17-1.7,5.69-2.56,18.39-10.42,36.73-20.94,55.16-31.3,2.74-1.54,3.45-3.51,3.44-6.48-.08-27.64,0-55.28-.06-82.93C376.67,412.24,376.46,410.31,376.27,407.27Zm6.14-200.48c-2.1-1.46-3.36-2.49-4.76-3.29-23-13.14-46-26.18-68.87-39.42-3.17-1.83-5.56-1.67-8.65.11-22.77,13.13-45.63,26.09-68.45,39.12-1.5.86-2.89,1.9-4.59,3a15.49,15.49,0,0,0,2,1.79c13.17,7.46,26.31,15,39.59,22.23,1.36.73,3.9.37,5.41-.42q12.6-6.57,24.93-13.67c4-2.31,7.41-2.48,11.53,0,7.95,4.83,16.2,9.2,24.44,13.55,1.53.81,4.07,1.47,5.35.77C354.13,223,367.8,215.11,382.41,206.79Zm86.55,148a13.2,13.2,0,0,0-2.78.64c-13.62,7.71-27.27,15.35-40.75,23.29-1.46.86-2.66,3.46-2.67,5.25-.16,28.14-.11,56.28-.06,84.42a55.36,55.36,0,0,0,.64,5.74c2.27-1.13,3.77-1.8,5.2-2.6,11.86-6.74,23.64-13.66,35.62-20.17,3.53-1.92,4.94-4,4.9-8.11-.21-20.81-.1-41.62-.1-62.44Zm-46.41,6.86c2.92-1.43,4.56-2.12,6.1-3,12-6.82,23.93-13.78,36-20.45,3.17-1.75,4.4-3.8,4.37-7.45-.18-20.13-.12-40.27-.13-60.41v-5.81a22.26,22.26,0,0,0-4,1.22c-13.18,7.46-26.39,14.84-39.38,22.61-1.62,1-2.79,4-2.83,6.08-.25,15.64-.16,31.28-.17,46.93,0,6.29,0,12.63,0,20.27Zm-236.31-.41a33.67,33.67,0,0,0,.48-3.73c0-21,.14-41.94-.11-62.91a8.73,8.73,0,0,0-3.55-6.25c-12.76-7.81-25.76-15.25-38.71-22.76a17.37,17.37,0,0,0-3.51-1.15,11.42,11.42,0,0,0-.48,2c0,22-.08,43.93.17,65.9,0,1.79,1.85,4.23,3.51,5.22,12.58,7.49,25.32,14.69,38,21.95a42.53,42.53,0,0,0,4.2,1.72ZM354.91,240.77a35.69,35.69,0,0,0,3.24,2.49c18,10.4,36,20.86,54.19,31,1.61.9,4.8.26,6.66-.76,11.68-6.39,23.19-13.08,34.76-19.69l5.32-3.23a18,18,0,0,0-2.28-2c-18.34-10.53-36.64-21.11-55.11-31.4-1.56-.87-4.55-.45-6.29.47-7.22,3.8-14.2,8-21.28,12.1Zm-205,9.34a51.6,51.6,0,0,0,4.43,3c12,6.81,24.11,13.49,36,20.43,3,1.73,5.22,1.69,8.18,0,17.13-9.93,34.38-19.66,51.57-29.48,1.33-.76,2.54-1.75,4.45-3.09-11.31-6.56-22.2-12.05-32.16-18.88-8.53-5.85-15.29-5.71-24.06,0-15.32,9.91-31.56,18.39-48.42,28ZM407.62,389.29c-5,2.62-8.74,4.12-11.9,6.41-1.69,1.22-3.36,3.81-3.37,5.79-.16,28.29-.05,56.58,0,84.87,0,1.53.28,3.07.49,5.36,3.52-1.91,6.17-3.61,9-4.83,4.44-1.92,5.77-5,5.72-9.81-.22-20.46,0-40.93,0-61.4C407.63,407.4,407.62,399.12,407.62,389.29Z"/>
              </svg>
              <div>
                <h1 className="text-xl font-display font-bold text-ink leading-none">Boxshell</h1>
                <p className="text-xs font-mono text-ink-muted mt-0.5">
                  {stats.totalBoxes} cajas · {stats.totalItems} objetos
                </p>
              </div>
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
