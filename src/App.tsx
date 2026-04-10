import { useEffect } from 'react'
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
      <AppRoutes />
    </BrowserRouter>
  )
}
