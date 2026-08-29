import { Navigate, useLocation } from 'react-router-dom'
import { destinoPrototipo } from '@/utils/planPaths'

/** `/prototipo/:rol/...` → URLs de producción por rol. */
export default function PrototipoRedirect() {
  const { pathname, search } = useLocation()
  return <Navigate to={destinoPrototipo(pathname, search)} replace />
}
