import { Link } from 'react-router-dom'
import { RUTA_EMPRENDEDOR } from '../constants'

type Props = {
  to: string
  children: string
  variante?: 'lleno' | 'oscuro' | 'texto'
  dataMm?: string
}

function destinoEmprendedor(to: string): string {
  if (to.startsWith('http') || to.startsWith('/admin') || to.startsWith(RUTA_EMPRENDEDOR)) return to
  return `${RUTA_EMPRENDEDOR}${to.startsWith('/') ? to : `/${to}`}`
}

/**
 * @deprecated Usar `Boton` de `@/prototipo/compartido/ui` (con prop `to`).
 * Link con look de botón primario (navegación del prototipo).
 */
export default function EnlacePrimario({ to, children, variante = 'lleno', dataMm }: Props) {
  const destino = destinoEmprendedor(to)
  const attrs = dataMm ? { 'data-mm': dataMm } : {}
  if (variante === 'texto') {
    return (
      <Link to={destino} className="flex min-h-11 items-center justify-center text-[13px] font-bold text-hc-primary" {...attrs}>
        {children}
      </Link>
    )
  }
  const fondo = variante === 'oscuro' ? 'bg-hc-text' : 'bg-hc-primary'
  return (
    <Link
      to={destino}
      className={`${fondo} flex min-h-11 w-full items-center justify-center rounded-[14px] px-5 py-4 text-center text-[15px] font-bold text-white`}
      {...attrs}
    >
      {children}
    </Link>
  )
}
