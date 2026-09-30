import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import AdminErrorBoundary from '@/app/AdminErrorBoundary'
import ErrorBoundaryComprador from '@/components/comprador/estados/ErrorBoundaryComprador'
import { esRutaPanel } from '@/components/comprador/estados/falloServidorHelpers'

/** Paneles conservan su pantalla de error; el comprador ve el fallo del servidor del Figma. */
export default function ErrorBoundaryPorArea({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  if (!esRutaPanel(pathname)) return <ErrorBoundaryComprador>{children}</ErrorBoundaryComprador>
  return (
    <AdminErrorBoundary
      titulo="Error inesperado"
      detalle="Algo salió mal. Recargá la página. Si el problema sigue, contactá soporte."
      accion="Recargar"
    >
      {children}
    </AdminErrorBoundary>
  )
}
