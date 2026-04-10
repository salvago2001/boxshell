import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ToastMessage, ToastType } from '../../types';

const toastConfig: Record<ToastType, { icon: typeof CheckCircle; classes: string }> = {
  success: {
    icon: CheckCircle,
    classes: 'border-emerald-800/50 bg-emerald-950/80 text-emerald-300',
  },
  error: {
    icon: XCircle,
    classes: 'border-red-800/50 bg-red-950/80 text-red-300',
  },
  info: {
    icon: Info,
    classes: 'border-blue-800/50 bg-blue-950/80 text-blue-300',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-amber-800/50 bg-amber-950/80 text-amber-300',
  },
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  const removeToast = useStore((s) => s.removeToast);
  const [visible, setVisible] = useState(false);

  const config = toastConfig[toast.type];
  const Icon = config.icon;

  // Animación de entrada
  useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md',
        'shadow-xl max-w-sm w-full pointer-events-auto',
        'transition-all duration-300',
        config.classes,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      ].join(' ')}
    >
      <Icon size={16} className="shrink-0 mt-0.5" />
      <p className="text-sm leading-snug flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Cerrar notificación"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts);

  return (
    <div
      className="fixed bottom-24 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
      aria-live="polite"
      aria-label="Notificaciones"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
