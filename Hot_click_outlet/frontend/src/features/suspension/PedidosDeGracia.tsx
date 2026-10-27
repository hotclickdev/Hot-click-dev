import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { billingService } from '@/services/billingService'
import { orderService } from '@/services/orderService'
import { ESTADOS_GESTION_GRACIA, type PedidoDeGracia } from './suspensionImpaga'

/** Extensión de admin: el dueño ve y gestiona (estado y guía) solo los pedidos creados durante la gracia. */
export default function PedidosDeGracia({ venceEn }: { venceEn?: string | null }) {
  const { t } = useTranslation()
  const [pedidos, setPedidos] = useState<PedidoDeGracia[] | null>(null)
  const [error, setError] = useState(false)
  const [guias, setGuias] = useState<Record<number, string>>({})

  const cargar = useCallback(() => {
    billingService.pedidosImpago()
      .then(({ data }) => { setPedidos(Array.isArray(data) ? data : []); setError(false) })
      .catch(() => setError(true))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const accion = async (fn: () => Promise<unknown>) => {
    try { await fn(); cargar() } catch { setError(true) }
  }

  return (
    <section className="rounded-lg border p-4" style={{ borderColor: 'var(--hc-border)' }}>
      <h2 className="mb-1 font-medium">{t('suspension.extensionTitulo')}</h2>
      <p className="mb-3 text-sm text-hc-muted">{t('suspension.extensionTexto', { fecha: venceEn ?? '' })}</p>
      {error && <p role="alert" className="text-sm text-red-600">{t('suspension.error')}</p>}
      {pedidos && pedidos.length === 0 && <p className="text-sm">{t('suspension.sinPedidosGracia')}</p>}
      <ul className="flex flex-col gap-3">
        {pedidos?.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 rounded-md border p-3 text-sm" style={{ borderColor: 'var(--hc-border)' }}>
            <div className="flex justify-between gap-2">
              <span className="font-medium">{p.numeroPedido ?? `#${p.id}`}</span>
              <span>{p.estadoPedido}</span>
            </div>
            <label className="flex items-center gap-2">
              {t('suspension.cambiarEstado')}
              <select className="rounded border p-1" value="" onChange={(e) => { if (e.target.value) void accion(() => orderService.updateStatus(p.id, e.target.value)) }}>
                <option value="">—</option>
                {ESTADOS_GESTION_GRACIA.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <input className="flex-1 rounded border p-1" placeholder={t('suspension.guia')} value={guias[p.id] ?? p.numeroGuia ?? ''}
                onChange={(e) => setGuias({ ...guias, [p.id]: e.target.value })} />
              <button type="button" className="rounded border px-3" disabled={!(guias[p.id] ?? '').trim()}
                onClick={() => { void accion(() => orderService.asignarGuia(p.id, (guias[p.id] ?? '').trim())) }}>
                {t('suspension.guardarGuia')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
