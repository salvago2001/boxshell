import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { BoxView } from './pages/BoxView'
import { ItemView } from './pages/ItemView'
import { ScanView } from './pages/ScanView'
import { Settings } from './pages/Settings'
import { BottomNav } from './components/ui/BottomNav'
import { ToastContainer } from './components/ui/Toast'
import { useStore } from './store/useStore'

// Componente que aplica la clase dark al <html> según el ajuste
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

// Auto-pull al arrancar si hay sync configurado
// IMPORTANTE: esperar a que Zustand termine de rehidratar desde IndexedDB antes de
// comprobar items.length, porque IDB es async y el estado inicial siempre empieza vacío.
function SyncOnMount() {
  const pullFromCloud = useStore((s) => s.pullFromCloud)
  const syncEnabled  = useStore((s) => s.settings.sync?.enabled)
  const importData   = useStore((s) => s.importData)

  // Zustand persist expone hasHydrated/onFinishHydration en el objeto del store
  const [hydrated, setHydrated] = useState(
    () => (useStore as any).persist?.hasHydrated?.() ?? false
  )

  useEffect(() => {
    if (hydrated) return
    const unsub = (useStore as any).persist?.onFinishHydration?.(() => setHydrated(true))
    return unsub
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    if (syncEnabled) {
      pullFromCloud(true)
      return
    }
    // Leer items directamente del store (estado ya hidratado, no la snapshot del render)
    if (useStore.getState().items.length === 0) {
      fetch('/boxshell/data/seed.json')
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.items?.length) importData(data, true) })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  return null
}

// Animación de entrada al cambiar de ruta
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
      <SyncOnMount />
      <AppRoutes />
    </BrowserRouter>
  )
}
