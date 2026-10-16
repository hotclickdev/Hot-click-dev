import { useCallback, useEffect, useRef, useState } from 'react'
import { EncabezadoPagina, Boton } from '@/prototipo/compartido/ui'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import { cobrosOnvoApi, type CuentaCobros } from './cobrosOnvoApi'
import {
  DETALLE_SUSPENDIDA, PASOS_COBRO, TEXTO_PRIVACIDAD, VISTAS_ESTADO, detallePausada, textoFrecuencia, type Tono,
} from './estadosCobro'

const TONOS: Record<Tono, string> = {
  neutro: 'bg-[var(--hc-n-100)] text-hc-n-900',
  amarillo: 'bg-hc-warning-bg text-hc-warning',
  azul: 'bg-hc-blue-50 text-hc-blue-600',
  verde: 'bg-hc-success-bg text-hc-success-text',
  rojo: 'bg-hc-danger-bg text-hc-danger',
}
const CAJAS = { info: 'bg-hc-blue-50 text-hc-n-900', ok: 'bg-hc-success-bg text-hc-success-text', mal: 'bg-hc-danger-bg text-hc-danger' }

/**
 * S2-25 · Activar cobros (lámina activar-cobros-390-estados / 1440). Una sola CTA roja y solo en
 * «Sin cuenta» y «Onboarding pendiente». Al volver de ONVO se refresca el estado y el foco va al chip.
 * Depende del contrato supuesto de cobrosOnvoApi (sin backend todavía).
 */
export default function ActivarCobrosPage({ volverA, rutaSoporte }: { volverA: string; rutaSoporte: string }) {
  const [cuenta, setCuenta] = useState<CuentaCobros | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const chipRef = useRef<HTMLSpanElement>(null)

  const cargar = useCallback((enfocar: boolean) => {
    cobrosOnvoApi.estado()
      .then((c) => { setCuenta(c); setError(null); if (enfocar) requestAnimationFrame(() => chipRef.current?.focus()) })
      .catch(() => setError('Todavía no podemos mostrar el estado de tus cobros. Probá de nuevo en un rato.'))
  }, [])

  useEffect(() => {
    cargar(false)
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(true) }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [cargar])

  async function abrirOnvo(obtener: () => Promise<string | null>) {
    setOcupado(true)
    setAviso(null)
    try {
      const url = await obtener()
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      else setAviso('No pudimos abrir ONVO. Probá de nuevo.')
      cargar(false)
    } catch {
      setAviso('No pudimos abrir ONVO. Probá de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  async function reenviar() {
    setOcupado(true)
    try {
      await cobrosOnvoApi.reenviarEnlace()
      setAviso('Te mandamos un enlace nuevo a tu correo.')
    } catch {
      setAviso('No pudimos reenviar el enlace. Probá de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const vista = cuenta ? VISTAS_ESTADO[cuenta.estado] : null
  const detalle = cuenta?.estado === 'PAUSADA' ? detallePausada(cuenta.pausadaEl) : cuenta?.estado === 'SUSPENDIDA' ? DETALLE_SUSPENDIDA : null

  return (
    <EntradaPagina>
      <main className="px-5 pb-8 pt-[60px] md:max-w-[760px]">
        <EncabezadoPagina titulo="Activar cobros" volverA={volverA} />
        {error && <p role="alert" className="mt-4 text-[13px] text-hc-danger">{error}</p>}
        {!cuenta && !error && <p className="mt-4 text-[13px] text-hc-muted" aria-busy="true">Cargando…</p>}
        {cuenta && vista && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[20px] font-bold">Cobros</h2>
              <span ref={chipRef} tabIndex={-1} aria-live="polite" className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${TONOS[vista.tono]}`}>
                {vista.etiqueta}
              </span>
            </div>
            <p className={`rounded-[12px] px-3.5 py-3 text-[13px] ${CAJAS[vista.caja]}`}>
              {vista.mensaje}
              {detalle && <span className="mt-1 block text-[12px] text-hc-muted">{detalle}</span>}
            </p>
            <ol aria-label="Pasos para activar cobros" className="flex flex-col gap-3 rounded-[12px] border border-hc-border bg-hc-surface p-4">
              {PASOS_COBRO.map((p, i) => {
                const hecho = i < vista.paso
                const actual = i === vista.paso
                return (
                  <li key={p.titulo} aria-current={actual ? 'step' : undefined} className="flex items-start gap-3">
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${hecho ? 'bg-hc-success-bg text-hc-success-text' : actual ? 'bg-hc-primary text-white' : 'bg-[var(--hc-n-100)] text-hc-muted'}`}>
                      {hecho ? '✓' : i + 1}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[14px] font-semibold">{p.titulo}</span>
                      <span className="text-[12px] text-hc-muted">{p.detalle}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
            {vista.conFrecuencia && cuenta.frecuencia && (
              <div className="flex flex-col gap-1 rounded-[12px] border border-hc-border bg-hc-surface p-4">
                <span className="text-[12px] text-hc-muted">Liquidación</span>
                <b className="text-[14px]">{textoFrecuencia(cuenta.frecuencia).titulo}</b>
                <span className="text-[12px] text-hc-muted">{textoFrecuencia(cuenta.frecuencia).detalle}</span>
              </div>
            )}
            {vista.conPrivacidad && <p className="rounded-[12px] bg-hc-blue-50 px-3.5 py-3 text-[12px] text-hc-n-900">{TEXTO_PRIVACIDAD}</p>}
            {aviso && <p role="status" className="text-[12px] text-hc-muted">{aviso}</p>}
            <div className="flex flex-col gap-2">
              {vista.cta === 'activar' && <Boton onClick={() => abrirOnvo(cobrosOnvoApi.activar)} disabled={ocupado}>Activar cobros</Boton>}
              {vista.cta === 'continuar' && <Boton onClick={() => abrirOnvo(cobrosOnvoApi.enlace)} disabled={ocupado}>Continuar en ONVO</Boton>}
              {vista.secundaria === 'reenviar' && <Boton variante="contorno" onClick={reenviar} disabled={ocupado}>Reenviar enlace</Boton>}
              {vista.secundaria === 'soporte' && <Boton variante="contorno" to={rutaSoporte}>Escribir a soporte</Boton>}
              {vista.secundaria === 'ir-onvo' && <Boton variante="contorno" onClick={() => abrirOnvo(cobrosOnvoApi.enlace)} disabled={ocupado}>Ir a ONVO</Boton>}
            </div>
          </div>
        )}
      </main>
    </EntradaPagina>
  )
}
