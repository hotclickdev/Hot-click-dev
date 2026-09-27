import { Link } from 'react-router-dom'
import {
  MENSAJE_FALTA_UBICACION,
  debeAvisarFaltaUbicacion,
} from '@/prototipo/compartido/ubicacionDespachoEstado'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useUbicacionDespacho } from '../hooks/useUbicacionDespacho'

const RUTA_NUEVA_BODEGA = `${RUTA_EMPRENDEDOR}/opciones/bodegas/nueva`

type Props = Readonly<{ className?: string }>

/**
 * Aviso para negocios sin ubicación de despacho (mismo estilo que los avisos
 * de `VendedorAvisos`). No se muestra mientras carga ni si la consulta falla.
 */
export default function AvisoFaltaUbicacion({ className = '' }: Props) {
  const { estado } = useUbicacionDespacho()
  if (!debeAvisarFaltaUbicacion(estado)) return null

  return (
    <div
      role="alert"
      data-mm="seller-aviso-ubicacion"
      className={`w-full rounded-xl px-4 py-3 text-sm ${className}`}
      style={{ background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)', border: '1px solid var(--hc-border)' }}
    >
      <p className="font-semibold">{MENSAJE_FALTA_UBICACION}</p>
      <Link to={RUTA_NUEVA_BODEGA} className="mt-1 inline-flex min-h-11 items-center font-semibold underline">
        Cargar ubicación
      </Link>
    </div>
  )
}
