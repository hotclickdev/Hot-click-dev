import { useEffect, useState } from 'react'
import { altaFasesAdminService } from '@/services/altaNegocioService'
import { Aviso, Carga, Chip, TARJETA, TITULO } from './piezas'
import { formatoMonto, leerReintegros, textoEstado, totalesPendientes, type NegocioReintegro } from './reintegros'

/**
 * Saldo por reintegrar: cobros en línea que cayeron a la cuenta principal de HotClick y que se le deben al negocio.
 * Solo ADMIN de plataforma (el backend lo exige). «Marcar reintegrado» deja constancia de quién y cuándo.
 */
export default function ReintegrosPlataforma() {
  const [negocios, setNegocios] = useState<NegocioReintegro[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [marca, setMarca] = useState(0)

  useEffect(() => {
    altaFasesAdminService.reintegros()
      .then((r) => { setNegocios(leerReintegros(r.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [marca])

  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudo cargar el saldo por reintegrar.</Aviso>
  const totales = Object.entries(totalesPendientes(negocios))
  return (
    <div className="flex flex-col gap-4">
      <div className={TARJETA}>
        <h2 className={TITULO}>Saldo por reintegrar</h2>
        <p className="mt-1 text-sm text-hc-n-600">
          Pagos en línea que entraron a la cuenta de HotClick y que se le deben al negocio.
        </p>
        <p className="mt-2 font-display text-[22px] font-extrabold">
          {totales.length === 0 ? 'Nada pendiente' : totales.map(([m, v]) => formatoMonto(v, m)).join(' · ')}
        </p>
      </div>
      {negocios.length === 0 && <Aviso>No hay cobros por reintegrar.</Aviso>}
      {negocios.map((n) => (
        <NegocioFila key={`${n.empresaId}-${n.moneda}`} negocio={n} onCambio={() => setMarca((x) => x + 1)} />
      ))}
    </div>
  )
}

function NegocioFila({ negocio, onCambio }: { negocio: NegocioReintegro; onCambio: () => void }) {
  const [nota, setNota] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  async function marcar(accion: () => Promise<unknown>) {
    setOcupado(true)
    setError('')
    try {
      await accion()
      onCambio()
    } catch (err) {
      console.error(err)
      setError('No se pudo marcar como reintegrado.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <article className={TARJETA}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={TITULO}>{negocio.negocio}</h3>
        <Chip tono={negocio.cantidadPendiente > 0 ? 'alerta' : 'ok'}>
          {negocio.cantidadPendiente > 0 ? `Por reintegrar: ${formatoMonto(negocio.montoPendiente, negocio.moneda)}` : 'Al día'}
        </Chip>
      </div>
      <p className="mt-1 text-xs text-hc-n-600">Ya reintegrado: {formatoMonto(negocio.montoReintegrado, negocio.moneda)}</p>
      <ul className="mt-3 divide-y divide-hc-n-200">
        {negocio.pagos.map((p) => (
          <li key={p.pagoId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span>
              <span className="font-semibold">{p.pedido || `Pago ${p.pagoId}`}</span>
              {' · '}{formatoMonto(p.monto, p.moneda)}{' · '}{textoEstado(p.estado)}
              {p.estado === 'REINTEGRADO' && p.reintegradoPor ? ` (${p.reintegradoPor}${p.nota ? `, ${p.nota}` : ''})` : ''}
            </span>
            {p.estado === 'NO_REINTEGRADO' && (
              <button type="button" disabled={ocupado} onClick={() => void marcar(() => altaFasesAdminService.marcarPago(p.pagoId, nota))}
                className="text-sm font-semibold text-hc-blue-600 disabled:opacity-60">
                Marcar reintegrado
              </button>
            )}
          </li>
        ))}
      </ul>
      {negocio.cantidadPendiente > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-48 flex-1 text-xs font-semibold text-hc-n-600">
            Nota o referencia (opcional)
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300}
              className="mt-1 h-11 w-full rounded-xl border border-hc-n-200 px-3 text-sm text-hc-n-900" />
          </label>
          <button type="button" disabled={ocupado}
            onClick={() => void marcar(() => altaFasesAdminService.marcarNegocio(negocio.empresaId, nota))}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-hc-primary px-4 text-sm font-semibold text-white disabled:opacity-60">
            Marcar todo reintegrado
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-hc-primary-text">{error}</p>}
    </article>
  )
}
