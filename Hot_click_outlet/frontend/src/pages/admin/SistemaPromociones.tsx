import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { copilotService } from '@/services/copilotService'
import { ofertaService } from '@/services/ofertaService'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import Spinner from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import TextoFlecha from '@/components/ui/TextoFlecha'
import { listaProductosDesdeRespuesta } from './sistema-productos/sistemaProductosHelpers'
import { mensajeErrorProducto } from './productos/productosHelpers'
import type { Id } from '@/types/api'
import type { Producto } from '@/types/producto'

const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'
const DESCUENTO_SUGERIDO_LENTOS = 15

const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  PENDIENTE: { bg: 'rgba(23,71,168,0.08)', text: 'var(--hc-accent)' },
  RECHAZADO: { bg: '#f7ead2',              text: '#8a5a00' },
}

type SolicitudOferta = {
  id?: Id
  productoId?: Id
  estadoSolicitud?: string
  nombreProducto?: string
  imagenUrl?: string
  porcentajeDescuento?: number
  fechaSolicitud?: string
  comentarioRevisor?: string
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ProductRow({ p, onAplicar, disabled, pctSugerido }: {
  p: Producto
  onAplicar: (id: Id, pct: number) => Promise<void>
  disabled: boolean
  pctSugerido?: number
}) {
  const { t } = useTranslation()
  const [pct, setPct] = useState(pctSugerido ? String(pctSugerido) : '')
  const [saving, setSaving] = useState(false)
  const nombre = p.nombreProducto ?? p.nombre
  const imagen = p.imagenPrincipalUrl ?? p.imagenUrl

  async function handleApply() {
    const n = Number(pct)
    if (!pct || n < 1 || n > 99) return
    if (p.id == null) return
    setSaving(true)
    await onAplicar(p.id, n)
    setSaving(false)
    setPct('')
  }

  return (
    <div className="flex items-center gap-3 rounded-xl p-3 flex-wrap" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
      {imagen && (
        <img src={imagen} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{nombre}</p>
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          {formatPrice(p.precioVenta)}
          {p.enOferta && p.precioOferta && <span className="ml-2 font-semibold" style={{ color: 'var(--hc-primary)' }}>{t('adminOfertas.now')} {formatPrice(p.precioOferta)}</span>}
        </p>
      </div>
      {p.enOferta ? (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#f7ead2', color: '#8a5a00' }}>
          {t('adminOfertas.activeBadge', { pct: p.porcentajeDescuento })}
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number" min={1} max={99} value={pct}
            onChange={e => setPct(e.target.value)}
            placeholder={t('adminOfertas.pctPh')}
            disabled={disabled}
            className="w-20 px-2.5 py-1.5 rounded-lg text-sm"
            style={{ border: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}
          />
          <button type="button"
            onClick={handleApply} disabled={saving || !pct || disabled}
            className="px-3.5 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
          >
            {saving ? '...' : t('adminOfertas.apply')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function SistemaPromociones() {
  const { t } = useTranslation()
  const toast = useToast()
  const [productos, setProductos] = useState<Producto[]>([])
  const [pendientes, setPendientes] = useState<SolicitudOferta[]>([])
  const [lentos, setLentos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, sRes, iRes] = await Promise.all([
        productService.adminGetAll(),
        ofertaService.misPendientes().catch((err: unknown) => {
          console.error('[SistemaPromociones] pendientes', err)
          return { data: [] }
        }),
        copilotService.getInsights().catch((err: unknown) => {
          console.error('[SistemaPromociones] insights', err)
          return { data: {} }
        }),
      ])
      setProductos(listaProductosDesdeRespuesta(pRes.data))
      setPendientes(Array.isArray(sRes.data) ? sRes.data as SolicitudOferta[] : [])
      const insights = iRes.data as { lentos?: unknown } | undefined
      setLentos(Array.isArray(insights?.lentos) ? insights.lentos as Producto[] : [])
    } catch {
      toast({ message: t('adminOfertas.errorLoadSistema'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [t, toast])

  useEffect(() => { cargar() }, [cargar]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  async function handleAplicar(id: Id, pct: number) {
    try {
      const { data } = await ofertaService.aplicar(id, true, pct)
      const cuerpo = data as { pendiente?: boolean } | undefined
      if (cuerpo?.pendiente) {
        toast({ message: t('adminOfertas.pendingApproval'), type: 'success' })
        cargar()
      }
    } catch (err: unknown) {
      toast({ message: mensajeErrorProducto(err, t('adminOfertas.errorSend')), type: 'error' })
    }
  }

  const pendientesActivos = pendientes.filter(s => s.estadoSolicitud === 'PENDIENTE' || s.estadoSolicitud === 'RECHAZADO')
  const idsConSolicitudPendiente = new Set(pendientes.filter(s => s.estadoSolicitud === 'PENDIENTE').map(s => s.productoId))
  const idsLentos = new Set(lentos.map((p) => Number(p.id)))
  const sugeridos = productos.filter((p) => idsLentos.has(Number(p.id)) && !p.enOferta)

  const filtrados = productos.filter((p) => {
    if (idsLentos.has(Number(p.id)) && !p.enOferta) return false
    if (!search) return true
    const nombre = (p.nombreProducto ?? p.nombre ?? '').toLowerCase()
    return nombre.includes(search.toLowerCase())
  })

  const estadoLabel = (estado?: string) => {
    if (estado === 'RECHAZADO') return t('adminOfertas.statusRejected')
    return t('adminOfertas.statusPending')
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-4 max-w-[1060px]">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
        <TextoFlecha dir="atras">{t('adminClientes.backHome')}</TextoFlecha>
      </Link>

      <header>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.5px', color: 'var(--hc-text)' }}>{t('adminOfertas.titleSistema')}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--hc-muted)' }}>
          {t('adminOfertas.subtitleSistema', { pct: DESCUENTO_SUGERIDO_LENTOS })}
        </p>
      </header>

      {sugeridos.length > 0 && (
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>
            {t('adminOfertas.suggestedTitle')}
          </h2>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {t('adminOfertas.suggestedHint', { pct: DESCUENTO_SUGERIDO_LENTOS })}
          </p>
          <div className="flex flex-col gap-2">
            {sugeridos.map((p) => (
              <ProductRow
                key={p.id}
                p={p}
                onAplicar={handleAplicar}
                disabled={idsConSolicitudPendiente.has(p.id)}
                pctSugerido={DESCUENTO_SUGERIDO_LENTOS}
              />
            ))}
          </div>
        </div>
      )}

      {pendientesActivos.length > 0 && (
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>{t('adminOfertas.myRequests')}</h2>
          {pendientesActivos.map(s => {
            const color = ESTADO_COLOR[s.estadoSolicitud ?? ''] ?? ESTADO_COLOR.PENDIENTE
            return (
              <div key={s.id} className="flex items-start gap-3 rounded-xl p-3 flex-wrap" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                {s.imagenUrl && <img src={s.imagenUrl} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{s.nombreProducto}</p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: color.bg, color: color.text }}>
                      {estadoLabel(s.estadoSolicitud)}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                    {t('adminOfertas.sentAt', { pct: s.porcentajeDescuento, date: fmtDate(s.fechaSolicitud) })}
                  </p>
                  {s.estadoSolicitud === 'RECHAZADO' && s.comentarioRevisor && (
                    <p className="text-sm mt-1.5 rounded-lg px-3 py-2" style={{ backgroundColor: '#f7ead2', color: '#8a5a00' }}>
                      "{s.comentarioRevisor}"
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>{t('adminOfertas.yourProducts')}</h2>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('adminOfertas.searchPh')}
            className="px-3.5 py-2 rounded-lg text-sm w-56"
            style={{ border: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}
          />
        </div>
        <div className="flex flex-col gap-2">
          {filtrados.map(p => (
            <ProductRow key={p.id} p={p} onAplicar={handleAplicar} disabled={idsConSolicitudPendiente.has(p.id)} />
          ))}
          {filtrados.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--hc-muted)' }}>{t('adminOfertas.noResults')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
