import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { copilotService } from '@/services/copilotService'
import { ofertaService } from '@/services/ofertaService'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import Spinner from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'

const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'
const DESCUENTO_SUGERIDO_LENTOS = 15

const ESTADO_LABEL = {
  PENDIENTE: 'Pendiente de revisión',
  RECHAZADO: 'Necesita ajustes',
}
const ESTADO_COLOR = {
  PENDIENTE: { bg: 'rgba(23,71,168,0.08)', text: 'var(--hc-accent)' },
  RECHAZADO: { bg: '#f7ead2',              text: '#8a5a00' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ProductRow({ p, onAplicar, disabled, pctSugerido }) {
  const [pct, setPct] = useState(pctSugerido ? String(pctSugerido) : '')
  const [saving, setSaving] = useState(false)
  const nombre = p.nombreProducto ?? p.nombre
  const imagen = p.imagenPrincipalUrl ?? p.imagenUrl

  async function handleApply() {
    if (!pct || pct < 1 || pct > 99) return
    setSaving(true)
    await onAplicar(p.id, Number(pct))
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
          {p.enOferta && p.precioOferta && <span className="ml-2 font-semibold" style={{ color: 'var(--hc-primary)' }}>→ {formatPrice(p.precioOferta)}</span>}
        </p>
      </div>
      {p.enOferta ? (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#f7ead2', color: '#8a5a00' }}>
          -{p.porcentajeDescuento}% activa
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number" min={1} max={99} value={pct}
            onChange={e => setPct(e.target.value)}
            placeholder="% desc."
            disabled={disabled}
            className="w-20 px-2.5 py-1.5 rounded-lg text-sm"
            style={{ border: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}
          />
          <button type="button"
            onClick={handleApply} disabled={saving || !pct || disabled}
            className="px-3.5 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
          >
            {saving ? '...' : 'Aplicar'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function SistemaPromociones() {
  const toast = useToast()
  const [productos, setProductos] = useState([])
  const [pendientes, setPendientes] = useState([])
  const [lentos, setLentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, sRes, iRes] = await Promise.all([
        productService.adminGetAll(),
        ofertaService.misPendientes().catch((err) => {
          console.error('[SistemaPromociones] pendientes', err)
          return { data: [] }
        }),
        copilotService.getInsights().catch((err) => {
          console.error('[SistemaPromociones] insights', err)
          return { data: {} }
        }),
      ])
      setProductos(pRes.data?.content ?? pRes.data ?? [])
      setPendientes(Array.isArray(sRes.data) ? sRes.data : [])
      setLentos(Array.isArray(iRes.data?.lentos) ? iRes.data.lentos : [])
    } catch {
      toast({ message: 'Error cargando promociones', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar() }, [cargar]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  async function handleAplicar(id, pct) {
    try {
      const { data } = await ofertaService.aplicar(id, true, pct)
      if (data?.pendiente) {
        toast({ message: 'Promoción enviada — pendiente de aprobación del admin', type: 'success' })
        cargar()
      }
    } catch (err) {
      toast({ message: err?.response?.data?.message ?? 'Error enviando la promoción', type: 'error' })
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

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-4 max-w-[1060px]">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>← Inicio</Link>

      <header>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.5px', color: 'var(--hc-text)' }}>Promociones</h1>
        <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--hc-muted)' }}>
          HOTCLICK revisa antes de publicar. Arriba van las sugeridas (sin venta ~60 días, {DESCUENTO_SUGERIDO_LENTOS}%).
        </p>
      </header>

      {sugeridos.length > 0 && (
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>
            Sugeridas — sin venta reciente
          </h2>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            Un {DESCUENTO_SUGERIDO_LENTOS}% puede moverlas. El equipo revisa antes de publicar.
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
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>Mis solicitudes</h2>
          {pendientesActivos.map(s => {
            const color = ESTADO_COLOR[s.estadoSolicitud] ?? ESTADO_COLOR.PENDIENTE
            return (
              <div key={s.id} className="flex items-start gap-3 rounded-xl p-3 flex-wrap" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                {s.imagenUrl && <img src={s.imagenUrl} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{s.nombreProducto}</p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: color.bg, color: color.text }}>
                      {ESTADO_LABEL[s.estadoSolicitud]}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                    -{s.porcentajeDescuento}% · enviado {fmtDate(s.fechaSolicitud)}
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
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--hc-text)' }}>Tus productos</h2>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="px-3.5 py-2 rounded-lg text-sm w-56"
            style={{ border: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}
          />
        </div>
        <div className="flex flex-col gap-2">
          {filtrados.map(p => (
            <ProductRow key={p.id} p={p} onAplicar={handleAplicar} disabled={idsConSolicitudPendiente.has(p.id)} />
          ))}
          {filtrados.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--hc-muted)' }}>Sin resultados</p>
          )}
        </div>
      </div>
    </div>
  )
}
