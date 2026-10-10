import { Navigate, useLocation } from 'react-router-dom'

/** Redirección permanente de una URL vieja a la nueva, conservando ?query y #hash. */
export default function RedirigirConQuery({ a }: { a: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${a}${search}${hash}`} replace />
}
