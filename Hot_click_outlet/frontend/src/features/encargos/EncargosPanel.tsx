import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import EstadoError from '@/components/comprador/estados/EstadoError'
import { useToast } from '@/components/ui/Toast'
import {
  encargoService,
  type Encargo,
} from '@/services/encargoService'
import EstadoVacioConversacional from '@/prototipo/compartido/motion/EstadoVacioConversacional'
import { ItemListaStagger, ListaStagger } from '@/prototipo/compartido/motion/ListaStagger'
import { useEncargos, useEncargosKpis } from './useEncargos'
import EncargoDetalle from './EncargoDetalle'
import { formatPrice } from '@/utils/format'

const FILTROS = ['TODOS', 'PENDIENTE', 'APROBADO', 'PENDIENTE_PAGO', 'PAGADO', 'RECHAZADO', 'VENCIDO'] as const

const ETIQUETA_ESTADO: Record<string, string> = {
  TODOS: 'Todos',
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADO: 'Pagado',
  RECHAZADO: 'Rechazado',
  VENCIDO: 'Vencido',
}

type Props = Readonly<{
  titulo?: string
  subtitulo?: string
  mostrarKpis?: boolean
}>

/**
 * Panel compartido de encargos personalizados (admin + emprendedor).
 */
export default function EncargosPanel({
  titulo = 'Encargos personalizados',
  subtitulo = 'Revisá referencias, cotizá con precio y enviá el link de pago.',
  mostrarKpis = true,
}: Props) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState<string>('PENDIENTE')
  const [selected, setSelected] = useState<Encargo | null>(null)
  const [precio, setPrecio] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)

  const { data, isLoading, isError, refetch } = useEncargos(filtro)
  const { data: kpis } = useEncargosKpis()
  const lista = useMemo(() => data ?? [], [data])

  async function aprobar() {
    if (!selected) return
    const monto = Number(precio)
    if (!monto || monto < 1) {
      toast({ message: 'Indicá un precio válido', type: 'warning' })
      return
    }
    setBusy(true)
    try {
      await encargoService.aprobar(selected.id, monto, mensaje.trim() || undefined)
      toast({ message: 'Encargo aprobado. El cliente recibió el link de pago.', type: 'success' })
      cerrarModal()
      await invalidar()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ message: msg || 'No se pudo aprobar', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function rechazar() {
    if (!selected || !motivo.trim()) {
      toast({ message: 'Escribí el motivo del rechazo', type: 'warning' })
      return
    }
    setBusy(true)
    try {
      await encargoService.rechazar(selected.id, motivo.trim())
      toast({ message: 'Encargo rechazado', type: 'success' })
      cerrarModal()
      await invalidar()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ message: msg || 'No se pudo rechazar', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function fulfillment(estado: string) {
    if (!selected) return
    setBusy(true)
    try {
      await encargoService.fulfillment(selected.id, estado)
      toast({ message: 'Estado de producción actualizado', type: 'success' })
      cerrarModal()
      await invalidar()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ message: msg || 'No se pudo actualizar', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  function cerrarModal() {
    setSelected(null)
    setPrecio('')
    setMensaje('')
    setMotivo('')
  }

  async function invalidar() {
    await qc.invalidateQueries({ queryKey: ['encargos'] })
  }

  function abrir(encargo: Encargo) {
    setSelected(encargo)
    setPrecio(encargo.precioCotizado ? String(encargo.precioCotizado) : '')
    setMensaje('')
    setMotivo('')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>{titulo}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{subtitulo}</p>
      </div>

      {mostrarKpis && kpis ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KpiCard label="Pendientes" valor={kpis.pendientes} />
          <KpiCard label="Por pagar" valor={kpis.pendientePago} />
          <KpiCard label="Pagados" valor={kpis.pagados} />
          <KpiCard label="Ticket prom." valor={formatPrice(kpis.ticketPromedioCotizado)} />
        </div>
      ) : null}

      <div data-mm="seller-encargos-filtros" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${
              filtro === f ? 'border-hc-n-900 bg-hc-n-900 text-white' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'
            }`}
          >
            {t(`pedidos.estado.${f}`, { defaultValue: ETIQUETA_ESTADO[f] ?? f })}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3 py-4" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-hc-n-100" />)}
        </div>
      ) : isError ? (
        <EstadoError
          nivel="h2"
          titulo={t('common.error', { defaultValue: 'No pudimos cargar' })}
          texto={t('encargos.errorCarga', { defaultValue: 'No pudimos cargar los encargos.' })}
          accion={{ texto: t('comun.reintentar', { defaultValue: 'Reintentar' }), onClick: () => { void refetch() } }}
        />
      ) : lista.length === 0 ? (
        <EstadoVacioConversacional
          titulo="No hay encargos en este filtro"
          mensaje="Cuando un cliente pida algo personalizado, aparece acá para cotizar."
        />
      ) : (
        <div data-mm="seller-encargos-lista">
          <ListaStagger className="space-y-2">
            {lista.map((e) => (
              <ItemListaStagger key={e.id}>
                <button
                  type="button"
                  onClick={() => abrir(e)}
                  className="w-full text-left rounded-xl border p-3 hover:bg-black/5 transition"
                  style={{ borderColor: 'var(--hc-border)' }}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{e.productoNombre || `Producto #${e.productoId}`}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                        {e.nombreCliente} · {t(`pedidos.estado.${e.estado}`, { defaultValue: ETIQUETA_ESTADO[e.estado] ?? e.estado })}
                        {e.estadoFulfillment ? ` · ${e.estadoFulfillment}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {[e.imagenUrl1, e.imagenUrl2, e.imagenUrl3].filter(Boolean).slice(0, 3).map((url) => (
                        <img key={url as string} src={url as string} alt="" className="w-10 h-10 rounded object-cover" />
                      ))}
                    </div>
                  </div>
                </button>
              </ItemListaStagger>
            ))}
          </ListaStagger>
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <EncargoDetalle
            encargo={selected}
            precio={precio}
            onPrecioChange={setPrecio}
            mensaje={mensaje}
            onMensajeChange={setMensaje}
            motivo={motivo}
            onMotivoChange={setMotivo}
            busy={busy}
            onAprobar={() => void aprobar()}
            onRechazar={() => void rechazar()}
            onFulfillment={(est) => void fulfillment(est)}
            onCerrar={cerrarModal}
          />
        </div>
      ) : null}
    </div>
  )
}

function KpiCard({ label, valor }: { label: string; valor: number | string }) {
  return (
    <div className="rounded-xl border border-hc-n-200 bg-hc-n-0 p-3">
      <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>{valor}</p>
    </div>
  )
}
