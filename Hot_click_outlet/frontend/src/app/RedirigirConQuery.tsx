import { Navigate, useLocation, useParams } from 'react-router-dom'

/** Redirección permanente de una URL vieja a la nueva, conservando ?query y #hash. */
export default function RedirigirConQuery({ a }: { a: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${a}${search}${hash}`} replace />
}

/** /emprendimientos/:slug (enlace viejo) → la tienda del negocio (QA-114-4). */
export function RedirigirEmprendimientoATienda() {
  const { slug } = useParams()
  const { search, hash } = useLocation()
  return <Navigate to={slug ? `/tienda/${encodeURIComponent(slug)}${search}${hash}` : '/negocios'} replace />
}
