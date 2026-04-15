import { useRef, useState } from 'react';
import {
  Download, Upload, FileText, Trash2,
  Nfc, Moon, Sun, AlertTriangle, Cloud, CloudOff, RefreshCw, UploadCloud, DownloadCloud,
} from 'lucide-react';
import { useStore, getStorageSize, formatBytes } from '../store/useStore';
import { exportJSON, importJSON, exportCSV, STORAGE_WARNING_BYTES } from '../utils/export';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/Modal';
import { Section } from '../components/ui/Card';
import type { SyncConfig } from '../types';

export function Settings() {
  const { boxes, items, settings, updateSettings, importData, clearAllData, addToast, getStats, setSyncConfig, pushToCloud, pullFromCloud } = useStore();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearConfirm2, setShowClearConfirm2] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Estado sync ────────────────────────────────────────────────────────────
  const existingSync = settings.sync;
  const [syncUrl,     setSyncUrl]     = useState(existingSync?.supabaseUrl     ?? '');
  const [syncKey,     setSyncKey]     = useState(existingSync?.supabaseAnonKey ?? '');
  const [syncUserKey, setSyncUserKey] = useState(existingSync?.userKey         ?? '');
  const [syncEnabled, setSyncEnabled] = useState(existingSync?.enabled         ?? false);
  const [syncing,     setSyncing]     = useState(false);

  const handleSaveSyncConfig = () => {
    if (!syncUrl || !syncKey || !syncUserKey) {
      addToast('Rellena todos los campos de sincronización', 'error');
      return;
    }
    const config: SyncConfig = {
      supabaseUrl:     syncUrl.trim(),
      supabaseAnonKey: syncKey.trim(),
      userKey:         syncUserKey.trim(),
      enabled:         syncEnabled,
      lastSyncAt:      existingSync?.lastSyncAt ?? '',
    };
    setSyncConfig(config);
    addToast('Configuración de sync guardada', 'success');
  };

  const handlePush = async () => {
    setSyncing(true);
    await pushToCloud();
    setSyncing(false);
  };

  const handlePull = async () => {
    setSyncing(true);
    await pullFromCloud();
    setSyncing(false);
  };

  const stats = getStats();
  const storageSize = getStorageSize();
  const storagePercent = Math.min(100, (storageSize / STORAGE_WARNING_BYTES) * 100);
  const storageWarning = storageSize > STORAGE_WARNING_BYTES;

  const handleExportJSON = () => {
    exportJSON(boxes, items);
    addToast('Backup JSON descargado', 'success');
  };

  const handleExportCSV = () => {
    exportCSV(boxes, items);
    addToast('CSV de inventario descargado', 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await importJSON(file);
      importData(data, importMode === 'replace');
      addToast(
        `Importados ${data.boxes.length} cajas y ${data.items.length} objetos`,
        'success'
      );
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Error al importar el archivo',
        'error'
      );
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleClearAll = () => {
    clearAllData();
    addToast('Todos los datos eliminados', 'success');
    setShowClearConfirm2(false);
  };

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <header className="border-b border-surface-border px-4 py-5">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-display font-bold text-ink">Configuración</h1>
          <p className="text-xs font-mono text-ink-muted mt-0.5">Exportar, importar y ajustes</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-8">

        {/* ── Estadísticas ─────────────────────────────────────────────────── */}
        <Section title="Datos almacenados">
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-surface-border">
              <StatCell label="Cajas" value={stats.totalBoxes} />
              <StatCell label="Objetos" value={stats.totalItems} />
              <StatCell label="Vendidos" value={stats.soldItems} />
            </div>
            <div className="px-4 pb-4 pt-3 border-t border-surface-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-ink-muted">Espacio usado</span>
                <span className={`text-xs font-mono ${storageWarning ? 'text-amber-400' : 'text-ink-muted'}`}>
                  {formatBytes(storageSize)} / {formatBytes(STORAGE_WARNING_BYTES)}
                </span>
              </div>
              <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    storageWarning ? 'bg-amber-500' : 'bg-brand'
                  }`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              {storageWarning && (
                <div className="flex items-start gap-1.5 mt-2">
                  <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400">
                    Se está acercando al límite. Considera exportar y borrar fotos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Apariencia ───────────────────────────────────────────────────── */}
        <Section title="Apariencia">
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
            <SettingRow
              icon={settings.darkMode ? <Moon size={16} /> : <Sun size={16} />}
              label="Modo oscuro"
              description="Interfaz dark para uso nocturno"
              control={
                <Toggle
                  checked={settings.darkMode}
                  onChange={(v) => updateSettings({ darkMode: v })}
                />
              }
            />
          </div>
        </Section>

        {/* ── Sincronización ───────────────────────────────────────────────── */}
        <Section title="Sincronización en la nube">
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden divide-y divide-surface-border">

            {/* Estado actual */}
            <div className="px-4 py-3 flex items-center gap-3">
              {syncEnabled && existingSync?.supabaseUrl
                ? <Cloud size={16} className="text-brand shrink-0" />
                : <CloudOff size={16} className="text-ink-muted shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">
                  {syncEnabled && existingSync?.supabaseUrl ? 'Sync activo' : 'Sync desactivado'}
                </p>
                {existingSync?.lastSyncAt && (
                  <p className="text-xs text-ink-muted mt-0.5">
                    Última sync: {new Date(existingSync.lastSyncAt).toLocaleString('es-ES')}
                  </p>
                )}
              </div>
              <Toggle
                checked={syncEnabled}
                onChange={(v) => {
                  setSyncEnabled(v);
                  if (existingSync) setSyncConfig({ ...existingSync, enabled: v });
                }}
              />
            </div>

            {/* Campos de configuración */}
            <div className="px-4 py-4 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-ink-muted">Credenciales Supabase</p>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Project URL</label>
                <input
                  type="url"
                  value={syncUrl}
                  onChange={(e) => setSyncUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Anon / Public Key</label>
                <input
                  type="password"
                  value={syncKey}
                  onChange={(e) => setSyncKey(e.target.value)}
                  placeholder="eyJhbGci..."
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Código de sync (tu clave personal)</label>
                <input
                  type="text"
                  value={syncUserKey}
                  onChange={(e) => setSyncUserKey(e.target.value)}
                  placeholder="mi-clave-secreta-123"
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <p className="text-xs text-ink-muted mt-1">
                  Identificador único para tus datos. Usa el mismo código en todos tus dispositivos.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={handleSaveSyncConfig} className="w-full">
                Guardar configuración
              </Button>
            </div>

            {/* Acciones de sync */}
            {existingSync?.supabaseUrl && (
              <div className="px-4 py-3 flex gap-2">
                <button
                  onClick={handlePull}
                  disabled={syncing}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-surface-border text-sm text-ink-muted hover:text-brand hover:border-brand/50 transition-all disabled:opacity-50"
                >
                  <DownloadCloud size={15} />
                  Descargar nube
                </button>
                <button
                  onClick={handlePush}
                  disabled={syncing}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-surface-border text-sm text-ink-muted hover:text-brand hover:border-brand/50 transition-all disabled:opacity-50"
                >
                  {syncing
                    ? <RefreshCw size={15} className="animate-spin" />
                    : <UploadCloud size={15} />}
                  Subir local
                </button>
              </div>
            )}

            {/* Instrucciones rápidas */}
            <div className="px-4 py-3">
              <p className="text-xs text-ink-muted leading-relaxed">
                <strong className="text-ink">Setup:</strong> La URL y la clave ya están configuradas.
                Solo tienes que elegir un <strong className="text-ink">código de sync</strong> personal
                (cualquier texto, p.ej. tu nombre) y usarlo en todos tus dispositivos.
                Activa el toggle y pulsa <em>Guardar configuración</em>.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Exportar ─────────────────────────────────────────────────────── */}
        <Section title="Exportar">
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden divide-y divide-surface-border">
            <SettingRow
              icon={<Download size={16} />}
              label="Exportar backup JSON"
              description="Todos los datos en formato JSON"
              control={
                <Button size="sm" variant="secondary" onClick={handleExportJSON}>
                  Descargar
                </Button>
              }
            />
            <SettingRow
              icon={<FileText size={16} />}
              label="Exportar inventario CSV"
              description="Compatible con Excel y Google Sheets"
              control={
                <Button size="sm" variant="secondary" onClick={handleExportCSV}>
                  Descargar
                </Button>
              }
            />
          </div>
        </Section>

        {/* ── Importar ─────────────────────────────────────────────────────── */}
        <Section title="Importar">
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden divide-y divide-surface-border">
            <div className="px-4 py-3">
              <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">Modo de importación</p>
              <div className="flex gap-2">
                {(['merge', 'replace'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setImportMode(m)}
                    className={[
                      'flex-1 py-2 rounded-lg text-sm font-medium border transition-all',
                      importMode === m
                        ? 'bg-brand/15 border-brand/40 text-brand'
                        : 'border-surface-border text-ink-muted',
                    ].join(' ')}
                  >
                    {m === 'merge' ? 'Fusionar' : 'Reemplazar'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-muted mt-2">
                {importMode === 'merge'
                  ? 'Se añadirán los datos importados a los existentes.'
                  : '⚠️ Los datos existentes serán reemplazados completamente.'}
              </p>
            </div>
            <SettingRow
              icon={<Upload size={16} />}
              label="Importar archivo JSON"
              description="Selecciona un backup de BoxSell"
              control={
                <Button
                  size="sm"
                  variant="secondary"
                  loading={importing}
                  onClick={() => fileRef.current?.click()}
                >
                  Seleccionar
                </Button>
              }
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
        </Section>

        {/* ── NFC ──────────────────────────────────────────────────────────── */}
        <Section title="Instrucciones NFC">
          <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                <Nfc size={15} className="text-brand" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Cómo usar tags NFC</p>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  La Web NFC API solo funciona en Android con Chrome y con conexión HTTPS.
                  En iOS o desktop, usa la cámara para escanear QR.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Step n={1} text="Instala NFC Tools en tu Android (gratuita en Play Store)" />
              <Step n={2} text="Abre NFC Tools → Escribir → Añadir registro → URL" />
              <Step
                n={3}
                text={`Escribe la URL: ${settings.appUrl}/?id=[UUID-del-objeto]`}
              />
              <Step n={4} text="Acerca el tag NFC al móvil para grabar" />
              <Step n={5} text="Ya puedes acercar el tag a BoxSell para identificarlo" />
            </div>

            <div className="bg-surface-elevated border border-surface-border rounded-lg p-3">
              <p className="text-xs font-mono text-ink-muted">
                Alternativa: en BoxSell ve a Escanear → NFC para leer el UID del tag
                y asignarlo manualmente a una caja u objeto.
              </p>
            </div>

            <div className="pt-1">
              <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">URL base de la app</p>
              <input
                type="url"
                value={settings.appUrl}
                onChange={(e) => updateSettings({ appUrl: e.target.value })}
                className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="https://tu-dominio.com"
              />
            </div>
          </div>
        </Section>

        {/* ── Zona de peligro ───────────────────────────────────────────────── */}
        <Section title="Zona de peligro">
          <div className="bg-surface-card border border-red-900/30 rounded-xl overflow-hidden">
            <SettingRow
              icon={<Trash2 size={16} className="text-red-400" />}
              label={<span className="text-red-400">Borrar todos los datos</span>}
              description="Elimina cajas, objetos y fotos. Irreversible."
              control={
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowClearConfirm(true)}
                >
                  Borrar todo
                </Button>
              }
            />
          </div>
        </Section>

        {/* Versión */}
        <p className="text-center text-xs font-mono text-ink-faint pb-4">
          BoxSell v0.2.0 · Local + Supabase sync
        </p>
      </div>

      {/* Confirmación doble para borrar */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => { setShowClearConfirm(false); setShowClearConfirm2(true); }}
        title="¿Borrar todos los datos?"
        message="Esta acción eliminará permanentemente todas tus cajas, objetos y fotos. ¿Estás seguro?"
        confirmLabel="Sí, continuar"
        danger
      />
      <ConfirmModal
        isOpen={showClearConfirm2}
        onClose={() => setShowClearConfirm2(false)}
        onConfirm={handleClearAll}
        title="Confirmación final"
        message="⚠️ Última advertencia: todos los datos se perderán. ¿Confirmas el borrado completo?"
        confirmLabel="Borrar definitivamente"
        danger
      />
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center py-4 gap-1">
      <span className="text-2xl font-display font-bold text-ink">{value}</span>
      <span className="text-xs font-mono text-ink-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

function SettingRow({
  icon, label, description, control,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-ink-muted shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative h-6 w-11 rounded-full transition-colors duration-200',
        checked ? 'bg-brand' : 'bg-surface-elevated border border-surface-border',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="h-5 w-5 rounded-full bg-brand/15 border border-brand/30 text-brand text-xs font-mono flex items-center justify-center shrink-0">
        {n}
      </span>
      <p className="text-xs text-ink-muted leading-relaxed">{text}</p>
    </div>
  );
}
