import { Navigate } from 'react-router-dom'
import { visitanteRuta } from './visitanteMock'

/** Asistente Visitante: reusa el asesor IA del prototipo (sin salir del chrome). */
export default function VisitanteAsistentePage() {
  return <Navigate to={visitanteRuta('asesor-ia')} replace />
}
