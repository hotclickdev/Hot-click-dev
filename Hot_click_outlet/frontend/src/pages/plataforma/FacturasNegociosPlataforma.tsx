import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { facturaNegocioService, datosDe, type FacturaNegocioAdmin, type PaginaFacturasAdmin } from '@/services/facturaNegocioService'
import { etiquetaEstado, textoPeriodo, tonoEstado } from '@/utils/facturaNegocio'
import { formatPrice } from '@/utils/format'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Chip, Encabezado, TARJETA, TITULO } from './piezas'

const INPUT = 'h-11 rounded-xl border border-hc-n-200 bg-hc-surface px-3 text-sm text-hc-n-900 outline-none focus:border-hc-blue-600'
const ESTADOS = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'VENCIDA', 'NO_APLICA'] as const

function mensajeDe(err: unknown, porDefecto: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? porDefecto
}

function Detalle({ f, onCambio }: { f: FacturaNegocioAdmin; onCambio: (f: FacturaNegocioAdmin) => void }) {
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function accion(tipo: 'revisada' | 'recordar') {
    setOcupado(true)
    setMensaje(null)
    try {
      const r = tipo === 'revisada' ? await facturaNegocioService.marcarRevisada(f.id) : await facturaNegocioService.recordar(f.id)
      const nueva = datosDe<FacturaNegocioAdmin>(r)
      if (nueva) onCambio(nueva)
      setMensaje(tipo === 'revisada' ? 'Marcada como revisada.' : 'Recordatorio enviado.')
    } catch (err) {
      setMensaje(mensajeDe(err, 'No se pudo completar la acción.'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className={`${TARJETA} flex flex-col gap-3`} aria-label="Detalle de la factura">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={TITULO}>{f.nombreNegocio ?? `Negocio ${f.empresaId}`}</h2>
        <Chip tono={tonoEstado(f.estado)}>{etiquetaEstado(f.estado)}</Chip>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-hc-n-600">Quincena</dt><dd>{textoPeriodo(f.periodoDesde, f.periodoHasta)}</dd></div>
        <div><dt className="text-xs text-hc-n-600">Monto que debe facturar</dt><dd className="font-semibold">{formatPrice(f.montoCrc)}</dd></div>
        <div><dt className="text-xs text-hc-n-600">Fecha límite</dt><dd>{f.fechaLimite}</dd></div>
        <div><dt className="text-xs text-hc-n-600">Total de la factura</dt><dd>{f.totalFacturaCrc != null ? formatPrice(f.totalFacturaCrc) : '—'}</dd></div>
        <div><dt className="text-xs text-hc-n-600">IVA</dt><dd>{f.totalIvaCrc != null ? formatPrice(f.totalIvaCrc) : '—'}</dd></div>
        <div><dt className="text-xs text-hc-n-600">Clave</dt><dd className="break-all font-mono text-xs">{f.clave ?? '—'}</dd></div>
        <div><dt className="text-xs text-hc-n-600">Respuesta de Hacienda</dt><dd>{f.respuestaHacienda ?? (f.tieneRespuestaHacienda ? 'Subida' : 'No subida')}</dd></div>
        <div><dt className="text-xs text-hc-n-600">Mensaje receptor</dt><dd>{f.mensajeReceptorEstado ?? '—'}{f.fechaLimiteMensajeReceptor ? ` · plazo ${f.fechaLimiteMensajeReceptor}` : ''}</dd></div>
        <div><dt className="text-xs text-hc-n-600">Recordatorios</dt><dd>{f.recordatorios}</dd></div>
        <div><dt className="text-xs text-hc-n-600">Revisada</dt><dd>{f.revisada ? 'Sí' : 'No'}</dd></div>
      </dl>
      {f.errores.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-hc-n-600">Resultado de la validación</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-hc-primary">{f.errores.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {f.avisos.map((a) => <p key={a} className="text-sm text-hc-n-600">{a}</p>)}
      {mensaje && <p role="status" className="text-sm text-hc-n-900">{mensaje}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado || f.revisada} onClick={() => accion('revisada')}>Marcar revisada</button>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => accion('recordar')}>Recordar</button>
        <Link className={BOTON_SECUNDARIO} to={`/plataforma/negocios/${f.empresaId}`}>Ficha del negocio (enlace de pago)</Link>
      </div>
    </section>
  )
}

/** Solo ADMIN: facturas que los negocios le emiten a HotClick por quincena. */
export default function FacturasNegociosPlataforma() {
  const [estado, setEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [pagina, setPagina] = useState(0)
  const [datos, setDatos] = useState<PaginaFacturasAdmin | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elegida, setElegida] = useState<FacturaNegocioAdmin | null>(null)
  const [generando, setGenerando] = useState(false)

  const cargar = useCallback(() => {
    facturaNegocioService.listar({ estado, desde, page: pagina })
      .then((r) => { setDatos(datosDe<PaginaFacturasAdmin>(r)); setError(null) })
      .catch((err: unknown) => setError(mensajeDe(err, 'No se pudieron cargar las facturas de negocios.')))
  }, [estado, desde, pagina])

  useEffect(() => { cargar() }, [cargar])

  async function generar() {
    setGenerando(true)
    try {
      await facturaNegocioService.generar()
      cargar()
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo generar la quincena.'))
    } finally {
      setGenerando(false)
    }
  }

  function actualizar(f: FacturaNegocioAdmin) {
    setElegida(f)
    setDatos((d) => d ? { ...d, contenido: d.contenido.map((x) => (x.id === f.id ? f : x)) } : d)
  }

  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Facturas de negocios"
        detalle="Cada negocio inscrito y verificado le factura a HotClick sus productos de la quincena, con 7 días de plazo." />
      <div className={`${TARJETA} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1 text-xs font-semibold text-hc-n-600">
          Estado
          <select className={INPUT} value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(0) }}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{etiquetaEstado(e)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-hc-n-600">
          Quincena (inicio)
          <input type="date" className={INPUT} value={desde} onChange={(e) => { setDesde(e.target.value); setPagina(0) }} />
        </label>
        <button type="button" className={BOTON_PRIMARIO} disabled={generando} onClick={generar}>
          {generando ? 'Generando…' : 'Generar quincena cerrada'}
        </button>
      </div>
      {error && <Aviso>{error}</Aviso>}
      {!datos && !error && <Carga />}
      {datos && (
        <div className={`${TARJETA} overflow-x-auto`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-hc-n-600">
              <tr><th className="py-2 pr-3">Negocio</th><th className="py-2 pr-3">Quincena</th><th className="py-2 pr-3 text-right">Monto</th><th className="py-2 pr-3">Límite</th><th className="py-2 pr-3">Estado</th><th className="py-2">Revisada</th></tr>
            </thead>
            <tbody>
              {datos.contenido.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-hc-n-600">No hay facturas con estos filtros.</td></tr>
              )}
              {datos.contenido.map((f) => (
                <tr key={f.id} className="cursor-pointer border-t border-hc-n-200 hover:bg-hc-n-100" onClick={() => setElegida(f)}>
                  <td className="py-2 pr-3"><button type="button" className="text-left font-semibold text-hc-blue-600" onClick={() => setElegida(f)}>{f.nombreNegocio ?? `Negocio ${f.empresaId}`}</button></td>
                  <td className="py-2 pr-3">{textoPeriodo(f.periodoDesde, f.periodoHasta)}</td>
                  <td className="py-2 pr-3 text-right">{formatPrice(f.montoCrc)}</td>
                  <td className="py-2 pr-3">{f.fechaLimite}</td>
                  <td className="py-2 pr-3"><Chip tono={tonoEstado(f.estado)}>{etiquetaEstado(f.estado)}</Chip></td>
                  <td className="py-2">{f.revisada ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {datos.totalPaginas > 1 && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <button type="button" className={BOTON_SECUNDARIO} disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
              <span>Página {pagina + 1} de {datos.totalPaginas}</span>
              <button type="button" className={BOTON_SECUNDARIO} disabled={pagina + 1 >= datos.totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
            </div>
          )}
        </div>
      )}
      {elegida && <Detalle key={elegida.id} f={elegida} onCambio={actualizar} />}
    </div>
  )
}
