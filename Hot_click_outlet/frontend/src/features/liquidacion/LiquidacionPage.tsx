import { useEffect, useState, type FormEvent } from 'react'
import { EncabezadoPagina, Boton } from '@/prototipo/compartido/ui'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import SelectorFrecuencia, { OPCIONES_FRECUENCIA } from './SelectorFrecuencia'
import { frecuenciaApi, type EstadoFrecuencia, type Frecuencia } from './frecuenciaApi'

export function avisoCambioManual(actual: Frecuencia): string {
  const nombre = OPCIONES_FRECUENCIA.find((o) => o.valor === actual)?.titulo ?? actual
  return `El cambio lo aplicamos a mano en ONVO. Te avisamos por correo cuando quede aplicado; hasta entonces sigue la frecuencia actual (${nombre}).`
}

/** S2-28 · Perfil → Liquidación: cambiar la frecuencia, con el aviso del cambio manual en ONVO. */
export default function LiquidacionPage({ volverA }: { volverA: string }) {
  const [estado, setEstado] = useState<EstadoFrecuencia | null>(null)
  const [elegida, setElegida] = useState<Frecuencia | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [sinServicio, setSinServicio] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vivo = true
    frecuenciaApi.obtener()
      .then((e) => { if (vivo) { setEstado(e); setElegida(e.pendiente ?? e.actual) } })
      .catch(() => { if (vivo) setSinServicio(true) })
    return () => { vivo = false }
  }, [])

  async function guardar(ev: FormEvent) {
    ev.preventDefault()
    if (!elegida || !estado) return
    setGuardando(true)
    setMensaje(null)
    try {
      setEstado(await frecuenciaApi.cambiar(elegida))
      setMensaje('Guardamos tu cambio.')
    } catch {
      setMensaje('No se pudo guardar. Intentá de nuevo en un momento.')
    } finally {
      setGuardando(false)
    }
  }

  const cambio = estado && elegida && elegida !== estado.actual
  return (
    <EntradaPagina>
      <main className="px-5 pb-8 pt-[60px] md:max-w-[640px]">
        <EncabezadoPagina titulo="Liquidación" volverA={volverA} />
        <form onSubmit={guardar} className="mt-4 flex flex-col gap-4">
          <SelectorFrecuencia valor={elegida} onCambiar={setElegida} deshabilitado={!estado || guardando} />
          {estado && (cambio || estado.pendiente) && (
            <p role="note" className="rounded-[8px] bg-hc-warning-bg px-3 py-2 text-[12px] text-hc-warning">{avisoCambioManual(estado.actual)}</p>
          )}
          {sinServicio && <p role="status" className="text-[12px] text-hc-warning">Esta opción todavía no está disponible. Muy pronto vas a poder cambiarla desde acá.</p>}
          {mensaje && <p role="status" className="text-[12px] text-hc-muted">{mensaje}</p>}
          <Boton type="submit" disabled={!cambio || guardando}>{guardando ? 'Guardando…' : 'Guardar cambio'}</Boton>
        </form>
      </main>
    </EntradaPagina>
  )
}
