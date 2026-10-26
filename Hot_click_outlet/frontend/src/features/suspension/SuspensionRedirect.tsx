import { Navigate, useLocation } from 'react-router-dom'
import { destinoSuspension, useSuspensionStore } from './suspensionImpaga'

/** Con la tienda suspendida, cualquier ruta del panel lleva a la pantalla de pago. */
export default function SuspensionRedirect() {
  const suspendida = useSuspensionStore((s) => s.suspendida)
  const { pathname } = useLocation()
  const destino = destinoSuspension(suspendida, pathname)
  return destino ? <Navigate to={destino} replace /> : null
}
