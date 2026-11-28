import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { facturaNegocioService, datosDe, type FacturaNegocio, type LineaDesglose, type ResumenFacturaHotclick } from '@/services/facturaNegocioService'
import { errorArchivoXml, etiquetaEstado, sePuedeSubir, textoAvisoPanel, textoPeriodo, tonoEstado } from '@/utils/facturaNegocio'
import { formatPrice } from '@/utils/format'

const TARJETA = 'rounded-[14px] border border-hc-n-200 bg-hc-surface p-4'
const TITULO = 'font-display text-[17px] font-bold leading-6 text-hc-n-900'
const BOTON = 'inline-flex h-12 items-center justify-center rounded-xl bg-hc-primary px-4 text-[15px] font-semibold text-white disabled:opacity-60'
const TONO: Record<string, string> = {
  neutro: 'bg-hc-n-100 text-hc-n-600',
  ok: 'bg-hc-success-bg text-hc-success-text',
  alerta: 'bg-hc-danger-bg text-hc-primary-text',
  azul: 'bg-hc-blue-50 text-hc-blue-600',
}

function ChipEstado({ estado }: Readonly<{ estado: string }>) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONO[tonoEstado(estado)]}`}>
      {etiquetaEstado(estado)}
    </span>
  )
}

function Desglose({ lineas }: Readonly<{ lineas: LineaDesglose[] }>) {
  if (lineas.length === 0) return <p className="text-sm text-hc-n-600">Sin ventas de productos en esta quincena.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="text-xs text-hc-n-600">
          <tr><th className="py-2 pr-3">Producto</th><th className="py-2 pr-3">CAByS sugerido</th><th className="py-2 pr-3 text-right">Cant.</th><th className="py-2 text-right">Monto</th></tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={`${l.productoId ?? 'x'}-${i}`} className="border-t border-hc-n-200">
              <td className="py-2 pr-3 text-hc-n-900">{l.nombre ?? 'Producto'}</td>
              <td className="py-2 pr-3 font-mono text-xs">
                {l.cabysValido ? l.cabys : <span className="text-hc-primary">Falta CAByS</span>}
              </td>
              <td className="py-2 pr-3 text-right">{l.cantidad}</td>
              <td className="py-2 text-right font-semibold">{formatPrice(l.monto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Resultado({ f }: Readonly<{ f: FacturaNegocio }>) {
  if (f.errores.length === 0 && f.avisos.length === 0) return null
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {f.errores.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-hc-primary">
          {f.errores.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      {f.avisos.map((a) => <p key={a} className="text-sm text-hc-n-600">{a}</p>)}
    </div>
  )
}

/** Pestaña "Factura a HotClick" de la billetera del negocio. */
export default function FacturaHotclickPanel() {
  const [datos, setDatos] = useState<ResumenFacturaHotclick | null>(null)
  const [error, setError] = useState(false)
  const [xml, setXml] = useState<File | null>(null)
  const [respuesta, setRespuesta] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [ultimo, setUltimo] = useState<FacturaNegocio | null>(null)

  const cargar = useCallback(() => {
    facturaNegocioService.resumen()
      .then((r) => { setDatos(datosDe<ResumenFacturaHotclick>(r)); setError(false) })
      .catch(() => setError(true))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function subir(e: FormEvent, pendiente: FacturaNegocio) {
    e.preventDefault()
    const problema = errorArchivoXml(xml) ?? (respuesta ? errorArchivoXml(respuesta) : null)
    if (problema || !xml) { setMensaje(problema); return }
    setEnviando(true)
    setMensaje(null)
    try {
      const r = await facturaNegocioService.subirXml(pendiente.id, xml, respuesta)
      const f = datosDe<FacturaNegocio>(r)
      setUltimo(f)
      setMensaje(f?.estado === 'RECIBIDA'
        ? (f.mensajeEstado ?? 'Recibida, pendiente de revisión de HotClick.')
        : 'La factura no se aceptó. Revisá los motivos.')
      cargar()
    } catch (err) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response
      setMensaje(status?.data?.message ?? 'No se pudo subir la factura. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (error) return <p className="text-sm text-hc-primary">No se pudo cargar la factura a HotClick.</p>
  if (!datos) return <p className="text-sm text-hc-n-600">Cargando…</p>

  if (!datos.leCorrespondeFacturar) {
    return (
      <section className={TARJETA}>
        <h2 className={TITULO}>Factura a HotClick</h2>
        <p className="mt-2 text-sm text-hc-n-900">{datos.mensajeNoAplica ?? 'No te corresponde facturar: ya pagás el recargo del 14 %.'}</p>
        <p className="mt-1 text-xs text-hc-n-600">Si te inscribís en Hacienda y HotClick verifica tus datos, vas a facturar cada quincena y deja de cobrarse el recargo.</p>
      </section>
    )
  }

  const p = datos.pendiente
  const curso = datos.quincenaEnCurso
  return (
    <div className="flex flex-col gap-4">
      {p && (
        <section className={`${TARJETA} flex flex-col gap-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={TITULO}>Quincena del {textoPeriodo(p.periodoDesde, p.periodoHasta)}</h2>
            <ChipEstado estado={p.estado} />
          </div>
          <p className="text-sm font-semibold text-hc-n-900">{textoAvisoPanel(p.diasRestantes)}</p>
          <p className="text-sm text-hc-n-600">
            Monto a facturar: <strong className="text-hc-n-900">{formatPrice(p.montoCrc)}</strong> · Fecha límite {p.fechaLimite}
          </p>
          <Desglose lineas={p.desglose} />
          <Resultado f={ultimo && ultimo.id === p.id ? ultimo : p} />
          {sePuedeSubir(p.estado) && (
            <form className="flex flex-col gap-3" onSubmit={(e) => subir(e, p)} noValidate>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-hc-n-900">XML de la factura (firmado)</span>
                <input type="file" accept=".xml,application/xml,text/xml" onChange={(ev) => setXml(ev.target.files?.[0] ?? null)} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-hc-n-900">Respuesta de Hacienda (opcional)</span>
                <input type="file" accept=".xml,application/xml,text/xml" onChange={(ev) => setRespuesta(ev.target.files?.[0] ?? null)} />
              </label>
              {mensaje && <output className="block text-sm text-hc-n-900">{mensaje}</output>}
              <div><button type="submit" className={BOTON} disabled={enviando}>{enviando ? 'Revisando…' : 'Subir factura'}</button></div>
            </form>
          )}
        </section>
      )}

      <section className={`${TARJETA} flex flex-col gap-2`}>
        <h2 className={TITULO}>Datos para facturarle a HotClick</h2>
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-hc-n-600">Receptor</dt><dd className="text-hc-n-900">{datos.receptor.nombre ?? 'HotClick'}</dd></div>
          <div><dt className="text-xs text-hc-n-600">Cédula</dt><dd className="font-mono text-hc-n-900">{datos.receptor.cedula ?? 'Pendiente de configurar'}</dd></div>
          <div><dt className="text-xs text-hc-n-600">Correo</dt><dd className="break-words text-hc-n-900">{datos.receptor.correo ?? '—'}</dd></div>
          <div><dt className="text-xs text-hc-n-600">Plazo</dt><dd className="text-hc-n-900">{datos.diasParaFacturar} días después de cerrar la quincena</dd></div>
        </dl>
        <p className="text-xs text-hc-n-600">Tipo de comprobante: Factura Electrónica 4.4, con el CAByS de cada producto.</p>
      </section>

      <section className={`${TARJETA} flex flex-col gap-2`}>
        <h2 className={TITULO}>Quincena en curso ({textoPeriodo(curso.periodoDesde, curso.periodoHasta)})</h2>
        <p className="text-sm text-hc-n-600">
          Llevás <strong className="text-hc-n-900">{formatPrice(curso.montoCrc)}</strong> a facturar
          ({curso.base === 'BRUTO' ? 'precio de los productos' : 'productos menos la comisión'}). Es un estimado: el monto final se fija al cerrar.
        </p>
        <Desglose lineas={curso.desglose} />
      </section>

      {datos.historial.length > 0 && (
        <section className={`${TARJETA} flex flex-col gap-2`}>
          <h2 className={TITULO}>Historial</h2>
          <ul className="divide-y divide-hc-n-200">
            {datos.historial.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-hc-n-900">{textoPeriodo(f.periodoDesde, f.periodoHasta)}</span>
                <span className="flex items-center gap-2"><span>{formatPrice(f.montoCrc)}</span><ChipEstado estado={f.estado} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
