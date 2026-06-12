import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [tab, setTab] = useState('individual')
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [catSel, setCatSel] = useState('')
  const [pctCat, setPctCat] = useState('')
  const [applyingCat, setApplyingCat] = useState(false)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/productos/admin/todos'),
        api.get('/categorias'),
      ])
      setProductos(pRes.data?.data?.content ?? pRes.data?.data ?? [])
      setCategorias(cRes.data?.data ?? [])
    } catch {
      showToast('Error cargando datos', 'error')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line

  useEffect(() => { fetchData() }, [fetchData])

  async function handleToggle(id, enOferta, pct) {
    try {
      await api.patch(`/productos/${id}/oferta`, { enOferta, porcentajeDescuento: pct })
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
    } catch {
      showToast('Error actualizando oferta', 'error')
    }
  }

  async function handleCatOferta(enOferta) {
    if (!catSel) return showToast('Seleccioná una categoría', 'warning')
    if (enOferta && (!pctCat || pctCat < 1)) return showToast('Ingresá un % válido', 'warning')
    setApplyingCat(true)
    try {
      const res = await api.post(`/productos/oferta/categoria/${catSel}`, {
        enOferta, porcentajeDescuento: enOferta ? Number(pctCat) : null,
      })
      showToast(res.data?.message ?? 'Listo', 'success')
      fetchData()
    } catch {
      showToast('Error aplicando oferta', 'error')
    } finally {
      setApplyingCat(false)
    }
  }

  const filtrados = productos.filter(p =>
    !search || p.nombreProducto?.toLowerCase().includes(search.toLowerCase())
  )
  const enOfertaCount = productos.filter(p => p.enOferta).length

  const TAB = { borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 600, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s' }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--hc-text)', margin: 0 }}>Gestión de Ofertas</h1>
          <p style={{ fontSize: 13, color: 'var(--hc-muted)', margin: '4px 0 0' }}>
            {enOfertaCount} producto{enOfertaCount !== 1 ? 's' : ''} con oferta activa
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['individual', 'Por producto'], ['categoria', 'Por categoría']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            ...TAB,
            background: tab === key ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
            color: tab === key ? '#fff' : 'var(--hc-text)',
            borderColor: tab === key ? 'var(--hc-accent)' : 'var(--hc-border)',
          }}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'individual' && (
          <motion.div key="individual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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
          </motion.div>
        )}

        {tab === 'categoria' && (
          <motion.div key="categoria" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{
              padding: 24, borderRadius: 14,
              background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)',
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--hc-text)', marginTop: 0, marginBottom: 20 }}>
                Aplicar descuento masivo por categoría
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)', display: 'block', marginBottom: 6 }}>
                    Categoría
                  </label>
                  <select
                    value={catSel} onChange={e => setCatSel(e.target.value)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 9,
                      border: '1.5px solid var(--hc-border)', background: 'var(--hc-surface)',
                      color: 'var(--hc-text)', fontSize: 13,
                    }}
                  >
                    <option value="">-- Seleccioná una categoría --</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nombreCategoria}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--hc-muted)', display: 'block', marginBottom: 6 }}>
                    Porcentaje de descuento
                  </label>
                  <input
                    type="number" min={1} max={99} value={pctCat}
                    onChange={e => setPctCat(e.target.value)}
                    placeholder="Ej: 20 para 20% de descuento"
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 9,
                      border: '1.5px solid var(--hc-border)', background: 'var(--hc-surface)',
                      color: 'var(--hc-text)', fontSize: 13, boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handleCatOferta(true)} disabled={applyingCat}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 9,
                      background: '#dc2626', color: 'white',
                      fontSize: 13, fontWeight: 700, border: 'none',
                      cursor: applyingCat ? 'not-allowed' : 'pointer',
                      opacity: applyingCat ? 0.7 : 1,
                    }}
                  >
                    {applyingCat ? 'Aplicando...' : '🏷️ Aplicar oferta a toda la categoría'}
                  </button>
                  <button
                    onClick={() => handleCatOferta(false)} disabled={applyingCat}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 9,
                      background: 'var(--hc-surface)', color: 'var(--hc-text)',
                      fontSize: 13, fontWeight: 700,
                      border: '1.5px solid var(--hc-border)',
                      cursor: applyingCat ? 'not-allowed' : 'pointer',
                      opacity: applyingCat ? 0.7 : 1,
                    }}
                  >
                    Quitar ofertas de la categoría
                  </button>
                </div>
              </div>
            </div>

            {/* Preview de productos en la categoría seleccionada */}
            {catSel && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 13, color: 'var(--hc-muted)', marginBottom: 12 }}>
                  Productos en esta categoría ({productos.filter(p => String(p.categoriaId ?? p.categoria?.id) === String(catSel)).length}):
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {productos
                    .filter(p => String(p.categoriaId ?? p.categoria?.id) === String(catSel))
                    .map(p => (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)',
                        fontSize: 13,
                      }}>
                        <span style={{ color: 'var(--hc-text)', fontWeight: 500 }}>{p.nombreProducto}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'var(--hc-muted)' }}>{fmt(p.precioVenta)}</span>
                          {p.enOferta && <PctBadge pct={p.porcentajeDescuento} />}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
