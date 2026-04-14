import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Scan, Settings } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { to: '/scan', label: 'Escanear', icon: Scan, exact: false },
  { to: '/settings', label: 'Ajustes', icon: Settings, exact: false },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface-card/90 backdrop-blur-xl border-t border-surface-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              [
                'flex flex-col items-center gap-1 min-w-[60px] py-2 px-3',
                'rounded-xl transition-all duration-200',
                isActive
                  ? 'text-brand'
                  : 'text-ink-muted hover:text-ink',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'p-1.5 rounded-lg transition-all duration-200',
                    isActive ? 'bg-brand/15' : 'bg-transparent',
                  ].join(' ')}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider">
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// Botón de acción flotante (FAB) con submenú
interface FABProps {
  onNewBox: () => void;
  onNewItem: () => void;
  onScan: () => void;
}

import { useState } from 'react';
import { Plus, Box, Tag, Nfc } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FAB({ onNewBox, onNewItem }: Omit<FABProps, 'onScan'>) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { label: 'Nueva caja', icon: Box, onClick: () => { onNewBox(); setOpen(false); } },
    { label: 'Nuevo objeto', icon: Tag, onClick: () => { onNewItem(); setOpen(false); } },
    { label: 'Escanear NFC', icon: Nfc, onClick: () => { navigate('/scan'); setOpen(false); } },
  ];

  return (
    <>
      {/* Backdrop para cerrar el menú */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Subacciones */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col-reverse gap-3 items-end pb-16">
        {open &&
          actions.map(({ label, icon: Icon, onClick }, i) => (
            <div
              key={label}
              className="flex items-center gap-3 animate-fab-open"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="text-xs font-mono bg-surface-elevated border border-surface-border px-2 py-1 rounded-lg text-ink whitespace-nowrap shadow-card">
                {label}
              </span>
              <button
                onClick={onClick}
                className="h-11 w-11 rounded-full bg-surface-elevated border border-surface-border text-ink-muted hover:text-brand hover:border-brand/50 shadow-card transition-all duration-150 flex items-center justify-center"
                aria-label={label}
              >
                <Icon size={18} />
              </button>
            </div>
          ))}
      </div>

      {/* Botón principal */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          'fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full',
          'bg-brand text-white shadow-glow-brand',
          'flex items-center justify-center',
          'transition-all duration-200',
          open ? 'rotate-45 bg-brand-dark' : 'hover:bg-brand-light hover:scale-105',
        ].join(' ')}
        aria-label={open ? 'Cerrar menú' : 'Añadir'}
        aria-expanded={open}
      >
        <Plus size={24} />
      </button>
    </>
  );
}
