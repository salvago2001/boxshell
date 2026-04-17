import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { boxshellDiag } from './lib/idb-storage'

// Registrar el service worker para funcionalidad offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[BoxSell] Service worker registrado:', reg.scope)
      })
      .catch((err) => {
        console.warn('[BoxSell] Error al registrar service worker:', err)
      })
  })
}

// ─── Diagnóstico: helper global + alerta visible si IDB falla ────────────────
declare global {
  interface Window {
    __boxshellDiag: () => Promise<Record<string, unknown>>;
  }
}

window.__boxshellDiag = async () => {
  const res = await boxshellDiag();
  console.table(res);
  return res;
};

window.addEventListener('boxshell:idb-error', (e: Event) => {
  const msg = (e as CustomEvent<string>).detail;
  console.error(msg);
  // Banner fijo arriba para que sea imposible no verlo
  const id = 'boxshell-idb-error-banner';
  if (!document.getElementById(id)) {
    const bar = document.createElement('div');
    bar.id = id;
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#b91c1c;color:#fff;font:13px/1.4 system-ui;padding:10px 14px;text-align:center;';
    bar.textContent = msg;
    document.body.appendChild(bar);
  }
});

console.info('[BoxSell] Diagnóstico disponible: ejecuta  await window.__boxshellDiag()  en la consola');

const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
