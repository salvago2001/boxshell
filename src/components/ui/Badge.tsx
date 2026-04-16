import type { ItemStatus } from '../../types';
import { STATUS_CONFIG } from '../../types';

interface BadgeProps {
  status: ItemStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: BadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border font-mono font-medium uppercase tracking-wider',
        sizeClass,
        config.tailwind,
      ].join(' ')}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}

interface ColorBadgeProps {
  color: string;
  label?: string;
  size?: 'sm' | 'md';
}

export function ColorBadge({ color, label, size = 'md' }: ColorBadgeProps) {
  const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`${sizeClass} rounded-full shrink-0`}
        style={{ backgroundColor: color }}
      />
      {label && <span className="text-xs text-ink-muted">{label}</span>}
    </span>
  );
}

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-elevated border border-surface-border px-2 py-0.5 text-xs text-ink-muted max-w-full break-words">
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-ink-muted hover:text-ink ml-0.5 leading-none"
          aria-label={`Eliminar tag ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
