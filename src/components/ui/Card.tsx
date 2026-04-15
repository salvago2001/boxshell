import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  accentColor?: string;
}

export function Card({ children, className = '', onClick, hoverable = false, accentColor }: CardProps) {
  const base =
    'bg-surface-card border border-surface-border rounded-xl relative overflow-hidden transition-all duration-200';
  const hover = hoverable
    ? 'cursor-pointer hover:border-brand/30 hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0'
    : '';

  return (
    <div
      className={`${base} ${hover} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Línea de acento superior */}
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: accentColor }}
        />
      )}
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  accent?: string;
}

export function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <Card accentColor={accent}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">{label}</span>
          {icon && <span className="text-ink-muted">{icon}</span>}
        </div>
        <div className="text-2xl font-numbers font-bold text-ink">{value}</div>
        {sub && <div className="text-xs text-ink-muted mt-1">{sub}</div>}
      </div>
    </Card>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Section({ title, children, action, className = '' }: SectionProps) {
  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-mono uppercase tracking-widest text-ink-muted">{title}</h2>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}
