import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-surface-elevated border border-surface-border text-ink hover:border-brand/50 hover:bg-surface-elevated/80 active:scale-[0.98]',
  secondary:
    'bg-surface-card border border-surface-border text-ink hover:border-brand/30 active:scale-[0.98]',
  ghost:
    'bg-transparent text-ink-muted hover:text-ink hover:bg-surface-card active:scale-[0.98]',
  danger:
    'bg-red-950/50 border border-red-800/50 text-red-400 hover:bg-red-900/50 hover:border-red-600 active:scale-[0.98]',
  brand:
    'bg-brand text-white font-semibold hover:bg-brand-light shadow-glow-brand active:scale-[0.98]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-body font-medium',
          'transition-all duration-150 select-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <SpinnerIcon className="shrink-0" size={size} />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

function SpinnerIcon({ className, size }: { className?: string; size: Size }) {
  const dim = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  return (
    <svg
      className={`animate-spin ${className}`}
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
