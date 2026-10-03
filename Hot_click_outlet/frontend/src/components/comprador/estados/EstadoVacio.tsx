import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Accion = { texto: string; to?: string; onClick?: () => void }

/** Color del círculo del ícono: gris (404, pedidos), azul (solicitudes) o rojo claro (favoritos). */
type Tono = 'neutro' | 'azul' | 'rojo'

const CLASE_TONO: Record<Tono, string> = {
  neutro: 'bg-hc-n-100 text-hc-n-600',
  azul: 'bg-hc-blue-50 text-hc-blue-600',
  rojo: 'bg-hc-red-50 text-hc-red-600',
}

type EstadoVacioProps = {
  icono: ReactNode
  titulo: string
  texto?: string
  accion?: Accion
  secundaria?: Accion
  children?: ReactNode
  /** h1 en páginas completas (404, sin conexión); h2 cuando va dentro de otra página. */
  nivel?: 'h1' | 'h2'
  /** Color del círculo del ícono (por defecto gris). */
  tono?: Tono
  /**
   * `cuenta`: espaciado de los estados vacíos de ACC (Figma `45:1799`, `45:1848`, `45:1896`): márgenes de 20,
   * 12 entre bloques y texto de 14/20. `sistema` (por defecto) no cambia.
   */
  espaciado?: 'sistema' | 'cuenta'
}

const BOTON = 'flex min-h-12 w-full items-center justify-center rounded-[12px] px-4 text-[15px] font-semibold'

function BotonAccion({ accion, primaria }: { accion: Accion; primaria: boolean }) {
  const clase = primaria
    ? `${BOTON} bg-hc-red-500 text-hc-n-0 hover:bg-hc-red-600`
    : `${BOTON} border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50`
  if (accion.to) return <Link to={accion.to} className={clase}>{accion.texto}</Link>
  return <button type="button" onClick={accion.onClick} className={clase}>{accion.texto}</button>
}

/** Estado vacío o de error del comprador (Figma sección 10 · `45:1692`, `45:2198`). */
export default function EstadoVacio({ icono, titulo, texto, accion, secundaria, children, nivel = 'h2', tono = 'neutro', espaciado = 'sistema' }: EstadoVacioProps) {
  const Titulo = nivel
  const cuenta = espaciado === 'cuenta'
  return (
    <section className={`mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center ${cuenta ? 'px-5 pb-2 pt-10' : 'px-4 py-10'}`}>
      <span className={`flex h-16 w-16 items-center justify-center rounded-full ${CLASE_TONO[tono]}`}>{icono}</span>
      <Titulo className={`font-display text-[20px] font-bold text-hc-n-900 [text-wrap:balance] ${cuenta ? 'leading-[normal]' : 'leading-tight'}`}>{titulo}</Titulo>
      {texto && <p className={`text-[14px] leading-5 text-hc-n-600 ${cuenta ? '' : 'max-w-sm'}`}>{texto}</p>}
      {(accion || secundaria) && (
        <div className={`flex w-full flex-col ${cuenta ? 'mt-2 gap-3' : 'mt-2 gap-2'}`}>
          {accion && <BotonAccion accion={accion} primaria />}
          {secundaria && <BotonAccion accion={secundaria} primaria={false} />}
        </div>
      )}
      {children && <div className={`w-full ${cuenta && (accion || secundaria) ? '' : 'mt-2'}`}>{children}</div>}
    </section>
  )
}
