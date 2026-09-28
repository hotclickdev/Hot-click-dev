import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Accion = { texto: string; to?: string; onClick?: () => void }

type EstadoVacioProps = {
  icono: ReactNode
  titulo: string
  texto?: string
  accion?: Accion
  secundaria?: Accion
  children?: ReactNode
  /** h1 en páginas completas (404, sin conexión); h2 cuando va dentro de otra página. */
  nivel?: 'h1' | 'h2'
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
export default function EstadoVacio({ icono, titulo, texto, accion, secundaria, children, nivel = 'h2' }: EstadoVacioProps) {
  const Titulo = nivel
  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-hc-n-100 text-hc-n-600">{icono}</span>
      <Titulo className="font-display text-[20px] font-bold leading-tight text-hc-n-900 [text-wrap:balance]">{titulo}</Titulo>
      {texto && <p className="max-w-sm text-[14px] leading-5 text-hc-n-600">{texto}</p>}
      {(accion || secundaria) && (
        <div className="mt-2 flex w-full flex-col gap-2">
          {accion && <BotonAccion accion={accion} primaria />}
          {secundaria && <BotonAccion accion={secundaria} primaria={false} />}
        </div>
      )}
      {children && <div className="mt-2 w-full">{children}</div>}
    </section>
  )
}
