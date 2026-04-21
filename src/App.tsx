import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { BoxView } from './pages/BoxView'
import { ItemView } from './pages/ItemView'
import { ScanView } from './pages/ScanView'
import { Settings } from './pages/Settings'
import { BottomNav } from './components/ui/BottomNav'
import { ToastContainer } from './components/ui/Toast'
import { useStore } from './store/useStore'
import type { Box } from './types'

// ─── Colores rotativos para las 18 cajas por defecto ─────────────────────────
const DEFAULT_COLORS = [
  '#FF6B2B', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
]

// UUIDs FIJOS v4-compatibles para las 18 cajas por defecto.
// Son determinísticos: si el usuario hace clearAllData o importa un JSON
// que borra las cajas, al recrearlas automáticamente tendrán EXACTAMENTE
// los mismos UUIDs, así los items exportados antes siguen enlazando bien
// con su caja. Con UUIDs aleatorios el `importData(replace=true)` dejaba
// los items huérfanos y parecían "borrados" tras un refresh.
export const DEFAULT_BOX_IDS = Array.from({ length: 18 }, (_, i) =>
  `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
)

export function createDefaultBoxes(): Box[] {
  const createdAt = new Date().toISOString()
  return Array.from({ length: 18 }, (_, i) => ({
    id: DEFAULT_BOX_IDS[i],
    number: i + 1,
    nfcUid: '',
    name: `Caja ${i + 1}`,
    description: '',
    location: '',
    color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    createdAt,
  }))
}

// ─── Aplica la clase dark al <html> según el ajuste ──────────────────────────
function ThemeProvider() {
  const darkMode = useStore((s) => s.settings.darkMode)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return null
}

// ─── Primera carga: crea 18 cajas si no hay ninguna ──────────────────────────
// IDB es async → hay que esperar onFinishHydration antes de comprobar boxes.length,
// porque en el primer render el store siempre arranca vacío y sin espera crearía
// 18 cajas duplicadas encima de los datos ya guardados.
// Supabase NUNCA se toca automáticamente; solo con botones manuales en Ajustes.
function InitOnMount() {
  const importData = useStore((s) => s.importData)

  // Zustand persist expone hasHydrated / onFinishHydration en el objeto del store
  const [hydrated, setHydrated] = useState(
    () => (useStore as unknown as { persist?: { hasHydrated?: () => boolean } })
      .persist?.hasHydrated?.() ?? false
  )

  // Suscribirse a la hidratación si aún no ha ocurrido
  useEffect(() => {
    if (hydrated) return
    const unsub = (useStore as unknown as { persist?: { onFinishHydration?: (cb: () => void) => () => void } })
      .persist?.onFinishHydration?.(() => setHydrated(true))
    return unsub
  }, [hydrated])

  // Solo actuar cuando IDB ya está cargado
  useEffect(() => {
    if (!hydrated) return
    // Leer el estado actual del store (no la snapshot del render)
    if (useStore.getState().boxes.length === 0) {
      importData({ boxes: createDefaultBoxes(), items: [] }, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  return null
}

// ─── Maneja URLs NFC: ?box=N → /box/:id  |  ?id=UUID → /box/:id o /item/:id ─
function NfcRouteHandler() {
  const [params]     = useSearchParams()
  const navigate     = useNavigate()
  const boxes        = useStore((s) => s.boxes)
  const items        = useStore((s) => s.items)
  const findByNfcUid = useStore((s) => s.findByNfcUid)

  useEffect(() => {
    // Esperar a que haya cajas (primer render tras hidratación o creación)
    if (boxes.length === 0) return

    const boxNum  = params.get('box')
    const idParam = params.get('id')

    if (boxNum) {
      const num = parseInt(boxNum, 10)
      if (!isNaN(num)) {
        const box = boxes.find((b) => b.number === num)
        if (box) navigate(`/box/${box.id}`, { replace: true })
      }
      return
    }

    if (idParam) {
      // 1) Buscar por nfcUid
      const result = findByNfcUid(idParam)
      if (result) {
        navigate(result.type === 'box' ? `/box/${result.id}` : `/item/${result.id}`, { replace: true })
        return
      }
      // 2) Buscar por UUID directo (caja)
      const box = boxes.find((b) => b.id === idParam)
      if (box) { navigate(`/box/${box.id}`, { replace: true }); return }
      // 3) Buscar por UUID directo (item)
      const item = items.find((i) => i.id === idParam)
      if (item) { navigate(`/item/${item.id}`, { replace: true }); return }
    }
  // Re-ejecutar si boxes cambia (creación inicial tardía) o cambian los params
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes, params])

  return null
}

// ─── Animación de entrada al cambiar de ruta ─────────────────────────────────
function PageWrapper({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  )
}

function AppRoutes() {
  return (
    <>
      <NfcRouteHandler />
      <Routes>
        <Route
          path="/"
          element={
            <PageWrapper>
              <Dashboard />
            </PageWrapper>
          }
        />
        <Route
          path="/box/:id"
          element={
            <PageWrapper>
              <BoxView />
            </PageWrapper>
          }
        />
        <Route
          path="/item/:id"
          element={
            <PageWrapper>
              <ItemView />
            </PageWrapper>
          }
        />
        <Route
          path="/scan"
          element={
            <PageWrapper>
              <ScanView />
            </PageWrapper>
          }
        />
        <Route
          path="/settings"
          element={
            <PageWrapper>
              <Settings />
            </PageWrapper>
          }
        />
        {/* Fallback */}
        <Route
          path="*"
          element={
            <PageWrapper>
              <Dashboard />
            </PageWrapper>
          }
        />
      </Routes>

      <BottomNav />
      <ToastContainer />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider />
      <InitOnMount />
      <AppRoutes />
    </BrowserRouter>
  )
}
