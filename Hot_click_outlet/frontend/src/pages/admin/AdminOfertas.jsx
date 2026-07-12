import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import { useToast } from '@/components/ui/Toast'

const fmt = n => `₡${new Intl.NumberFormat('es-CR').format(n ?? 0)}`

function PctBadge({ pct }) {
  if (!pct) return null
  return (
    <span style={{
      background: 'rgba(220,38,38,0.12)', color: '#dc2626',
      fontSize: 11, fontWeight: 700, padding: '2px 7px',
      borderRadius: 6, border: '1px solid rgba(220,38,38,0.25)',
    }}>
      -{pct}%
    </span>
  )
}

function ProductRow({ p, onToggle, loading }) {
  const [pct, setPct] = useState(p.porcentajeDescuento ?? '')
  const [saving, setSaving] = useState(false)

  async function handleApply() {
    if (!pct || pct < 1 || pct > 99) return
    setSaving(true)
    await onToggle(p.id, true, Number(pct))
    setSaving(false)
  }

  async function handleQuit() {
    setSaving(true)
    await onToggle(p.id, false, null)
    setSaving(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: p.enOferta ? 'rgba(220,38,38,0.04)' : 'var(--hc-surface-2)',
      border: `1px solid ${p.enOferta ? 'rgba(220,38,38,0.2)' : 'var(--hc-border)'}`,
      borderRadius: 10, flexWrap: 'wrap',
    }}>
      {p.imagenPrincipalUrl && (
        <img src={p.imagenPrincipalUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--hc-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.nombreProducto}
        </p>
        <p style={{ fontSize: 12, color: 'var(--hc-muted)', margin: 0 }}>
          {fmt(p.precioVenta)}
          {p.enOferta && p.precioOferta && (
            <span style={{ marginLeft: 8, color: '#dc2626', fontWeight: 600 }}>→ {fmt(p.precioOferta)}</span>
          )}
        </p>
      </div>
      {p.enOferta && <PctBadge pct={p.porcentajeDescuento} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!p.enOferta ? (
          <>
            <input
              type="number" min={1} max={99} value={pct}
              onChange={e => setPct(e.target.value)}
              placeholder="% desc."
              style={{
                width: 80, padding: '5px 8px', borderRadius: 7,
                border: '1px solid var(--hc-border)',
                background: 'var(--hc-surface)',
                color: 'var(--hc-text)', fontSize: 12,
              }}
            />
            <button
              onClick={handleApply} disabled={saving || !pct}
              style={{
                padding: '5px 12px', borderRadius: 7,
                background: '#dc2626', color: 'white',
                fontSize: 12, fontWeight: 600, border: 'none',
                cursor: saving || !pct ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '...' : 'Aplicar'}
            </button>
          </>
        ) : (
          <button
            onClick={handleQuit} disabled={saving}
            style={{
              padding: '5px 12px', borderRadius: 7,
              background: 'var(--hc-surface-3)', color: 'var(--hc-text)',
              fontSize: 12, fontWeight: 600, border: '1px solid var(--hc-border)',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? '...' : 'Quitar oferta'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminOfertas() {
  const { showToast } = useToast()
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const pRes = await api.get('/productos/admin/todos')
      setProductos(pRes.data?.data?.content ?? pRes.data?.data ?? [])
    } catch {
      showToast('Error cargando datos', 'error')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  async function handleToggle(id, enOferta, pct) {
    try {
      const { data } = await api.patch(`/productos/${id}/oferta`, { enOferta, porcentajeDescuento: pct })
      if (data?.pendiente) {
        showToast('Promoción enviada — pendiente de aprobación del admin', 'success')
        return
      }
      setProductos(prev => prev.map(p => {
        if (p.id !== id) return p
        return {
          ...p,
          enOferta,
          porcentajeDescuento: enOferta ? pct : null,
          precioOferta: enOferta && pct ? Math.round(p.precioVenta * (1 - pct / 100)) : null,
        }
      }))
      showToast(enOferta ? `Oferta aplicada (-${pct}%)` : 'Oferta quitada', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error actualizando oferta', 'error')
    }
  }

  const filtrados = productos.filter(p =>
    !search || p.nombreProducto?.toLowerCase().includes(search.toLowerCase())
  )
  const enOfertaCount = productos.filter(p => p.enOferta).length

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--hc-text)', margin: 0 }}>Gestión de Ofertas</h1>
          <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
            {enOfertaCount} producto{enOfertaCount === 1 ? '' : 's'} con oferta activa
          </p>
        </div>
        <div style={{
          padding: '8px 16px', borderRadius: 10,
          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
          fontSize: 13, fontWeight: 700, color: '#dc2626',
        }}>
          🏷️ {enOfertaCount} en oferta
        </div>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar producto..."
        style={{
          width: '100%', padding: '9px 14px', borderRadius: 10, marginBottom: 16,
          border: '1.5px solid var(--hc-border)', background: 'var(--hc-surface-2)',
          color: 'var(--hc-text)', fontSize: 13, boxSizing: 'border-box',
        }}
      />
      {loading ? (
        <p style={{ color: 'var(--hc-muted)', textAlign: 'center', padding: 32 }}>Cargando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(p => (
            <ProductRow key={p.id} p={p} onToggle={handleToggle} />
          ))}
          {filtrados.length === 0 && (
            <p style={{ color: 'var(--hc-muted)', textAlign: 'center', padding: 32 }}>Sin resultados</p>
          )}
        </div>
      )}
    </div>
  )
}
