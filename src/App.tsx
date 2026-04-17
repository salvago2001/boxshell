import { useEffect } from 'react'
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

function createDefaultBoxes(): Box[] {
  return Array.from({ length: 18 }, (_, i) => ({
    id: crypto.randomUUID(),
    number: i + 1,
    nfcUid: '',
    name: `Caja ${i + 1}`,
    description: '',
    location: '',
    color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    createdAt: new Date().toISOString(),
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
// localStorage es síncrono → el store ya está hidratado en el primer render.
// Supabase NUNCA se toca automáticamente; solo con botones manuales en Ajustes.
function InitOnMount() {
  const boxes      = useStore((s) => s.boxes)
  const importData = useStore((s) => s.importData)

  useEffect(() => {
    if (boxes.length === 0) {
      importData({ boxes: createDefaultBoxes(), items: [] }, false)
    }
  // Solo al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
