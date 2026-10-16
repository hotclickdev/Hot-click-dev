import { useEffect, useState, type FormEvent } from 'react'
import { contraEntregaApi } from '@/services/contraEntregaApi'
import { EncabezadoPagina, Boton } from './ui'
import EntradaPagina from './motion/EntradaPagina'
import { configDesdeFormulario } from './contraEntregaConfigHelpers'

/**
 * S2 · Contra entrega por negocio, configuración (lámina S2-contra-entrega, tercera pantalla).
 * Depende de GET/PUT /api/negocio/contra-entrega, que todavía no existe (contrato en services/contraEntregaApi).
 * El cargo lo paga el cliente y lo calcula el backend; acá no se escribe ningún monto.
 */
export default function ContraEntregaConfigPage({ volverA }: { volverA: string }) {
  const [acepta, setAcepta] = useState(false)
  const [minimo, setMinimo] = useState('')
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin-servicio' | 'guardando' | 'guardado'>('cargando')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    contraEntregaApi.obtener()
      .then((c) => { if (!vivo) return; setAcepta(c.acepta); setMinimo(c.minimo ? String(c.minimo) : ''); setEstado('listo') })
      .catch(() => { if (vivo) setEstado('sin-servicio') })
    return () => { vivo = false }
  }, [])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const { config, error: err } = configDesdeFormulario(acepta, minimo)
    if (!config) { setError(err); return }
    setError(null)
    setEstado('guardando')
    try {
      await contraEntregaApi.guardar(config)
      setEstado('guardado')
    } catch {
      setError('No se pudo guardar. Intentá de nuevo en un momento.')
      setEstado('listo')
    }
  }

  const deshabilitado = estado === 'cargando' || estado === 'sin-servicio' || estado === 'guardando'
  return (
    <EntradaPagina>
      <main className="px-5 pb-8 pt-[60px] md:max-w-[560px]">
        <EncabezadoPagina titulo="Contra entrega" volverA={volverA} />
        <form onSubmit={guardar} className="mt-4 flex flex-col gap-4">
          <label className="flex items-start justify-between gap-4">
            <span className="flex flex-col gap-1">
              <span className="text-[14px] font-semibold text-hc-text">Aceptar contra entrega</span>
              <span className="text-[12px] text-hc-muted">Opcional. Tus clientes pagan en efectivo al recibir; el cargo de contra entrega lo paga el cliente.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={acepta}
              disabled={deshabilitado}
              onChange={(e) => setAcepta(e.target.checked)}
              className="mt-1 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-[var(--hc-n-200)] transition-colors checked:bg-hc-blue-600 disabled:opacity-50"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-hc-text">Pedido mínimo para contra entrega <span className="font-normal text-hc-muted">(opcional)</span></span>
            <input
              inputMode="numeric"
              placeholder="₡ · lo definís vos"
              value={minimo}
              disabled={deshabilitado || !acepta}
              onChange={(e) => setMinimo(e.target.value)}
              className="min-h-11 rounded-xl border border-hc-border bg-hc-surface px-3.5 text-sm"
            />
            <span className="text-[12px] text-hc-muted">Dejalo vacío si no querés mínimo.</span>
          </label>
          <p className="text-[12px] text-hc-muted">Si un carrito tiene un negocio que no acepta contra entrega, no se ofrece para ese pedido.</p>
          {estado === 'sin-servicio' && <p role="status" className="text-[12px] text-hc-warning">Esta opción todavía no está disponible. Muy pronto vas a poder activarla desde acá.</p>}
          {estado === 'guardado' && <p role="status" className="text-[12px] text-hc-success-text">Guardado.</p>}
          {error && <p role="alert" className="text-[12px] text-hc-danger">{error}</p>}
          <Boton type="submit" disabled={deshabilitado}>{estado === 'guardando' ? 'Guardando…' : 'Guardar'}</Boton>
        </form>
      </main>
    </EntradaPagina>
  )
}
