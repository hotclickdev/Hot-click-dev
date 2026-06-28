import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { compraService } from '@/services/compraService'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export default function AdminNuevaCompra() {
  const navigate      = useNavigate()
  const { showToast } = useToast()

  const [proveedores, setProveedores] = useState([])
  const [productos,   setProductos]   = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [notas,       setNotas]       = useState('')
  const [items,       setItems]       = useState([{ productoId: '', cantidad: 1, precioUnitario: 0 }])
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    Promise.all([
      compraService.listarProveedores(),
      productService.adminGetAll(0, 200),
    ]).then(([prov, prod]) => {
      setProveedores(prov)
      const lista = prod?.data?.content ?? prod?.data ?? []
      setProductos(lista)
    }).catch(() => showToast('Error al cargar datos', 'error'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = () =>
    setItems(p => [...p, { productoId: '', cantidad: 1, precioUnitario: 0 }])

  const removeItem = (i) =>
    setItems(p => p.filter((_, idx) => idx !== i))

  const updateItem = (i, field, val) =>
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it))

  const handleProductoChange = (i, productoId) => {
    const p = productos.find(p => String(p.id) === String(productoId))
    updateItem(i, 'productoId', productoId)
    if (p) updateItem(i, 'precioUnitario', p.precioCompra ?? 0)
  }

  const total = items.reduce((s, it) => {
    const n = Number.parseInt(it.cantidad) || 0
    const p = Number.parseInt(it.precioUnitario) || 0
    return s + n * p
  }, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validItems = items.filter(it => it.productoId && String(it.productoId).trim() !== '' && Number.parseInt(it.cantidad) > 0)
    if (validItems.length === 0) { showToast('Seleccioná al menos un producto válido con cantidad mayor a 0', 'error'); return }

    setSaving(true)
    try {
      await compraService.crear({
        proveedorId: proveedorId ? Number(proveedorId) : null,
        notas: notas || null,
        items: validItems.map(it => ({
          productoId:    Number(it.productoId),
          cantidad:      Number.parseInt(it.cantidad),
          precioUnitario: Number.parseInt(it.precioUnitario) || 0,
        })),
      })
      showToast('Orden de compra creada', 'success')
      navigate('/admin/compras')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al crear la orden', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 rounded-xl text-sm outline-none'
  const inpStyle = { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/admin/compras')}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
          ←
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Nueva orden de compra</h1>
      </div>

      {/* Proveedor y notas */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Información general</h2>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Proveedor</label>
          <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
            className={inp} style={inpStyle}>
            <option value="">— Sin proveedor —</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Notas (opcional)</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
            placeholder="Condiciones de entrega, observaciones…"
            className={`${inp} resize-none`} style={inpStyle}/>
        </div>
      </div>

      {/* Líneas de productos */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Productos a comprar</h2>
          <button type="button" onClick={addItem}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }}>
            + Agregar línea
          </button>
        </div>

        {/* Header columnas */}
        <div className="grid grid-cols-12 gap-2 text-[10px] font-medium px-1" style={{ color: 'var(--hc-muted)' }}>
          <div className="col-span-5">Producto</div>
          <div className="col-span-2 text-center">Cantidad</div>
          <div className="col-span-3 text-right">Precio unitario (₡)</div>
          <div className="col-span-2 text-right">Subtotal</div>
        </div>

        {items.map((item, i) => {
          const sub = (Number.parseInt(item.cantidad) || 0) * (Number.parseInt(item.precioUnitario) || 0)
          return (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <select value={item.productoId} onChange={e => handleProductoChange(i, e.target.value)}
                  className={inp} style={{ ...inpStyle, fontSize: '12px' }} required>
                  <option value="">— Seleccionar —</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombreProducto ?? p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <input type="number" min={1} value={item.cantidad}
                  onChange={e => updateItem(i, 'cantidad', e.target.value)}
                  className={`${inp} text-center`} style={inpStyle} required/>
              </div>
              <div className="col-span-3">
                <input type="number" min={0} value={item.precioUnitario}
                  onChange={e => updateItem(i, 'precioUnitario', e.target.value)}
                  className={`${inp} text-right`} style={inpStyle}/>
              </div>
              <div className="col-span-1 text-right text-xs font-medium" style={{ color: 'var(--hc-accent)' }}>
                {fmt(sub)}
              </div>
              <div className="col-span-1 flex justify-end">
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>✕</button>
                )}
              </div>
            </div>
          )
        })}

        {/* Total */}
        <div className="flex justify-end pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Total estimado</p>
            <p className="text-xl font-black" style={{ color: 'var(--hc-accent)' }}>₡{fmt(total)}</p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button type="button" onClick={() => navigate('/admin/compras')}
          className="flex-1 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          {saving ? 'Creando…' : 'Crear orden de compra'}
        </button>
      </div>
    </form>
  )
}
