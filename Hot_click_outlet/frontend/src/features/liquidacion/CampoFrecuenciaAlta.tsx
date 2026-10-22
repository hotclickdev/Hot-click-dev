import { useEffect, useRef } from 'react'
import SelectorFrecuencia from './SelectorFrecuencia'
import type { Frecuencia } from './frecuenciaApi'

/**
 * Selector obligatorio del alta del negocio (S2-28, lámina frecuencia-390/1440). Envuelve `SelectorFrecuencia` sin
 * cambiarlo: si el navegador bloquea el envío por el radio `required`, se cambia su globo nativo por el aviso
 * con role="alert" del selector.
 */
export default function CampoFrecuenciaAlta({ valor, onCambiar, error, onInvalido, deshabilitado = false }: {
  valor: Frecuencia | null
  onCambiar: (f: Frecuencia) => void
  error: string | null
  onInvalido: () => void
  deshabilitado?: boolean
}) {
  const contenedor = useRef<HTMLDivElement | null>(null)
  const alInvalido = useRef(onInvalido)
  useEffect(() => { alInvalido.current = onInvalido }, [onInvalido])
  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const escuchar = (e: Event) => { e.preventDefault(); alInvalido.current() }
    el.addEventListener('invalid', escuchar, true)
    return () => el.removeEventListener('invalid', escuchar, true)
  }, [])
  return (
    <div ref={contenedor}>
      <SelectorFrecuencia valor={valor} onCambiar={onCambiar} error={error} deshabilitado={deshabilitado} />
    </div>
  )
}
