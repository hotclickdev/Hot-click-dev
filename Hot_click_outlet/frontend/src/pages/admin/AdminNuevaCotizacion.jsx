import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cotizacionService, cotizacionClienteService, formatMonto } from '@/services/cotizacionService'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'

// ── Sub-componentes ──────────────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl border p-5 space-y-4"
      style={{ background: 'var(--hc-card)', borderColor: 'var(--hc-border)' }}>
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-[var(--hc-accent)]/30 transition-all"
const inputStyle = { background: 'var(--hc-bg)', color: 'var(--hc-text)', borderColor: 'var(--hc-border)' }

// ── Modal de cliente ──────────────────────────────────────────────────────────

function ModalCliente({ onClose, onCreado }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ nombreComercial: '', razonSocial: '', cedulaJuridica: '', correo: '', telefono: '', direccion: '', contactoPrincipal: '' })
  const [loading, setLoading] = useState(false)

  async function guardar() {
    if (!form.nombreComercial.trim()) { toast('El nombre comercial es obligatorio', 'error'); return }
    setLoading(true)
    try {
      const cliente = await cotizacionClienteService.crear(form)
      toast('Cliente creado', 'success')
      onCreado(cliente)
    } catch { toast('Error al crear cliente', 'error') }
    finally { setLoading(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border p-6 space-y-4"
        style={{ background: 'var(--hc-card)', borderColor: 'var(--hc-border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg" style={{ color: 'var(--hc-text)' }}>Nuevo cliente B2B</h3>
          <button onClick={onClose} style={{ color: 'var(--hc-muted)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Nombre comercial *', 'nombreComercial'],
            ['Razón social', 'razonSocial'],
            ['Cédula jurídica', 'cedulaJuridica'],
            ['Correo', 'correo'],
            ['Teléfono', 'telefono'],
            ['Contacto principal', 'contactoPrincipal'],
          ].map(([label, key]) => (
            <Field key={key} label={label}>
              <input className={inputCls} style={inputStyle}
                value={form[key]} onChange={e => set(key, e.target.value)} />
            </Field>
          ))}
          <div className="col-span-2">
            <Field label="Dirección">
              <input className={inputCls} style={inputStyle}
                value={form.direccion} onChange={e => set('direccion', e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium border"
            style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--hc-accent)', color: '#fff' }}>
            {loading ? 'Guardando...' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Fila de ítem ──────────────────────────────────────────────────────────────

function ItemRow({ item, index, productos, onChange, onRemove }) {
  const subtotal = Math.round(
    (item.precioUnitario || 0) * (item.cantidad || 1) *
    (1 - (item.descuentoPorcentaje || 0) / 100)
  )

  return (
    <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
      {/* Tipo / Producto */}
      <td className="px-3 py-2 w-64">
        {item.tipo === 'CATALOGO' ? (
          <select className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
            value={item.productoId ?? ''}
            onChange={e => {
              const p = productos.find(x => x.id === Number(e.target.value))
              if (!p) return
              onChange(index, {
                productoId:    p.id,
                nombre:        p.nombreProducto,
                codigo:        p.sku ?? '',
                descripcion:   p.descripcionCorta ?? '',
                imagenUrl:     p.imagenPrincipalUrl ?? '',
                precioUnitario: p.precioVenta,
              })
            }}>
            <option value="">— Seleccionar producto —</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>{p.nombreProducto}</option>
            ))}
          </select>
        ) : (
          <input className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
            placeholder="Nombre del ítem"
            value={item.nombre || ''}
            onChange={e => onChange(index, { nombre: e.target.value })} />
        )}
        <div className="flex gap-1 mt-1">
          {['CATALOGO', 'TEMPORAL'].map(t => (
            <button key={t}
              onClick={() => onChange(index, { tipo: t, productoId: null, nombre: '', codigo: '', imagenUrl: '', descripcion: '' })}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: item.tipo === t ? 'var(--hc-accent)' : 'var(--hc-border)',
                color: item.tipo === t ? '#fff' : 'var(--hc-muted)',
              }}>
              {t === 'CATALOGO' ? 'Catálogo' : 'Temporal'}
            </button>
          ))}
        </div>
      </td>
      {/* Imagen */}
      <td className="px-3 py-2 w-12">
        {item.imagenUrl
          ? <img src={item.imagenUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
          : <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--hc-border)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/>
              </svg>
            </div>
        }
      </td>
      {/* Código */}
      <td className="px-3 py-2 w-28">
        <input className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
          placeholder="SKU"
          value={item.codigo || ''}
          onChange={e => onChange(index, { codigo: e.target.value })} />
      </td>
      {/* Cantidad */}
      <td className="px-3 py-2 w-20">
        <input type="number" min={1} className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
          value={item.cantidad || 1}
          onChange={e => onChange(index, { cantidad: Number(e.target.value) })} />
      </td>
      {/* Unidad */}
      <td className="px-3 py-2 w-24">
        <select className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
          value={item.unidadMedida || 'UNIDAD'}
          onChange={e => onChange(index, { unidadMedida: e.target.value })}>
          {['UNIDAD', 'KG', 'LITRO', 'METRO', 'CAJA', 'HORA', 'SERVICIO'].map(u => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </td>
      {/* Precio unitario */}
      <td className="px-3 py-2 w-32">
        <input type="number" min={0} className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
          value={item.precioUnitario || 0}
          onChange={e => onChange(index, { precioUnitario: Number(e.target.value) })} />
      </td>
      {/* Descuento */}
      <td className="px-3 py-2 w-20">
        <input type="number" min={0} max={100} className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
          value={item.descuentoPorcentaje || 0}
          onChange={e => onChange(index, { descuentoPorcentaje: Number(e.target.value) })} />
      </td>
      {/* Subtotal */}
      <td className="px-3 py-2 w-32 text-right font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>
        {formatMonto(subtotal)}
      </td>
      {/* Borrar */}
      <td className="px-2 py-2 w-8">
        <button onClick={() => onRemove(index)} className="p-1 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: '#ef4444' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </td>
    </tr>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const ITEM_VACIO = { tipo: 'CATALOGO', productoId: null, codigo: '', nombre: '', descripcion: '', imagenUrl: '', cantidad: 1, unidadMedida: 'UNIDAD', precioUnitario: 0, descuentoPorcentaje: 0 }

export default function AdminNuevaCotizacion() {
  const navigate   = useNavigate()
  const { id }     = useParams()
  const { toast }  = useToast()
  const esEdicion  = !!id

  const [clientes,  setClientes]  = useState([])
  const [productos, setProductos] = useState([])
  const [items,     setItems]     = useState([{ ...ITEM_VACIO }])
  const [modalCliente, setModalCliente] = useState(false)
  const [loading,   setLoading]   = useState(false)

  const [form, setForm] = useState({
    clienteId:        '',
    fechaEmision:     new Date().toISOString().slice(0, 10),
    fechaVencimiento: '',
    estadoCotizacion: 'BORRADOR',
    aplicaIva:        false,
    porcentajeIva:    13,
    observaciones:    '',
    terminos:         'Validez de esta cotización: 30 días calendario.\nPrecios en colones costarricenses.\nForma de pago: 50% anticipo, 50% contra entrega.',
    moneda:           'CRC',
  })

  const cargarDatos = useCallback(async () => {
    try {
      const [listaClientes, listaProd] = await Promise.all([
        cotizacionClienteService.listar(),
        productService.getAll(0, 200).then(r => r.data?.content ?? r.data ?? []),
      ])
      setClientes(listaClientes)
      setProductos(listaProd)
    } catch { toast('Error al cargar datos', 'error') }
  }, [toast])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  useEffect(() => {
    if (!esEdicion) return
    cotizacionService.detalle(id).then(c => {
      setForm({
        clienteId:        c.cliente?.id ?? '',
        fechaEmision:     c.fechaEmision ?? '',
        fechaVencimiento: c.fechaVencimiento ?? '',
        estadoCotizacion: c.estadoCotizacion ?? 'BORRADOR',
        aplicaIva:        c.aplicaIva ?? false,
        porcentajeIva:    c.porcentajeIva ?? 13,
        observaciones:    c.observaciones ?? '',
        terminos:         c.terminos ?? '',
        moneda:           c.moneda ?? 'CRC',
      })
      setItems(c.items?.map(i => ({
        tipo:               i.tipo,
        productoId:         i.producto?.id ?? null,
        codigo:             i.codigo ?? '',
        nombre:             i.nombre ?? '',
        descripcion:        i.descripcion ?? '',
        imagenUrl:          i.imagenUrl ?? '',
        cantidad:           i.cantidad,
        unidadMedida:       i.unidadMedida,
        precioUnitario:     i.precioUnitario,
        descuentoPorcentaje: i.descuentoPorcentaje,
      })) ?? [{ ...ITEM_VACIO }])
    }).catch(() => toast('Error al cargar cotización', 'error'))
  }, [id, esEdicion, toast])

  // ── Cálculos de totales ──────────────────────────────────────────────────────

  const subtotal = items.reduce((acc, i) => {
    const base = (i.precioUnitario || 0) * (i.cantidad || 1)
    return acc + Math.round(base * (1 - (i.descuentoPorcentaje || 0) / 100))
  }, 0)

  const montoIva = form.aplicaIva ? Math.round(subtotal * (form.porcentajeIva || 13) / 100) : 0
  const total    = subtotal + montoIva

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const actualizarItem = (index, patch) =>
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...patch } : it))

  const agregarItem = () => setItems(prev => [...prev, { ...ITEM_VACIO }])

  const eliminarItem = (index) => setItems(prev => prev.filter((_, i) => i !== index))

  async function guardar() {
    if (!form.clienteId) { toast('Seleccioná un cliente', 'error'); return }
    if (items.length === 0) { toast('Agregá al menos un producto', 'error'); return }

    setLoading(true)
    try {
      const dto = {
        ...form,
        clienteId: Number(form.clienteId),
        items: items.map((it, orden) => ({ ...it, orden })),
      }
      if (esEdicion) {
        await cotizacionService.actualizar(id, dto)
        toast('Cotización actualizada', 'success')
      } else {
        await cotizacionService.crear(dto)
        toast('Cotización creada', 'success')
      }
      navigate('/admin/cotizaciones')
    } catch (e) {
      toast(e?.response?.data?.message ?? 'Error al guardar', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/cotizaciones')}
          className="p-2 rounded-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          style={{ color: 'var(--hc-muted)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
            {esEdicion ? 'Editar cotización' : 'Nueva cotización B2B'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            Completá los datos y agregá los productos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda — formulario */}
        <div className="lg:col-span-2 space-y-6">

          {/* Cliente */}
          <SectionCard title="Cliente">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Field label="Seleccionar cliente *">
                  <select className={inputCls} style={inputStyle}
                    value={form.clienteId}
                    onChange={e => setF('clienteId', e.target.value)}>
                    <option value="">— Elegir cliente —</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombreComercial}{c.cedulaJuridica ? ` • ${c.cedulaJuridica}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <button onClick={() => setModalCliente(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
                style={{ color: 'var(--hc-accent)', borderColor: 'var(--hc-accent)' }}>
                + Nuevo cliente
              </button>
            </div>

            {/* Preview del cliente seleccionado */}
            {form.clienteId && (() => {
              const c = clientes.find(x => x.id === Number(form.clienteId))
              if (!c) return null
              return (
                <div className="rounded-xl p-3 text-xs space-y-0.5 border"
                  style={{ background: 'var(--hc-bg)', borderColor: 'var(--hc-border)' }}>
                  <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>{c.razonSocial || c.nombreComercial}</p>
                  {c.cedulaJuridica  && <p style={{ color: 'var(--hc-muted)' }}>Cédula: {c.cedulaJuridica}</p>}
                  {c.correo          && <p style={{ color: 'var(--hc-muted)' }}>{c.correo}</p>}
                  {c.telefono        && <p style={{ color: 'var(--hc-muted)' }}>{c.telefono}</p>}
                  {c.direccion       && <p style={{ color: 'var(--hc-muted)' }}>{c.direccion}</p>}
                  {c.contactoPrincipal && <p style={{ color: 'var(--hc-muted)' }}>Contacto: {c.contactoPrincipal}</p>}
                </div>
              )
            })()}
          </SectionCard>

          {/* Fechas y estado */}
          <SectionCard title="Detalles de la cotización">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Fecha de emisión">
                <input type="date" className={inputCls} style={inputStyle}
                  value={form.fechaEmision}
                  onChange={e => setF('fechaEmision', e.target.value)} />
              </Field>
              <Field label="Fecha de vencimiento">
                <input type="date" className={inputCls} style={inputStyle}
                  value={form.fechaVencimiento}
                  onChange={e => setF('fechaVencimiento', e.target.value)} />
              </Field>
              <Field label="Estado">
                <select className={inputCls} style={inputStyle}
                  value={form.estadoCotizacion}
                  onChange={e => setF('estadoCotizacion', e.target.value)}>
                  {['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA'].map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Moneda">
                <select className={inputCls} style={inputStyle}
                  value={form.moneda}
                  onChange={e => setF('moneda', e.target.value)}>
                  <option value="CRC">₡ Colones (CRC)</option>
                  <option value="USD">$ Dólares (USD)</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          {/* Productos */}
          <SectionCard title="Productos">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                    {['Producto', 'Img', 'Código', 'Cant.', 'Unidad', 'Precio unit.', 'Desc. %', 'Subtotal', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--hc-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <ItemRow key={i} item={item} index={i}
                      productos={productos}
                      onChange={actualizarItem}
                      onRemove={eliminarItem} />
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={agregarItem}
              className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: 'var(--hc-accent)', borderColor: 'var(--hc-accent)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Agregar ítem
            </button>
          </SectionCard>

          {/* Observaciones y términos */}
          <SectionCard title="Notas y condiciones">
            <Field label="Observaciones">
              <textarea rows={3} className={inputCls} style={inputStyle}
                value={form.observaciones}
                onChange={e => setF('observaciones', e.target.value)}
                placeholder="Notas adicionales para el cliente..." />
            </Field>
            <Field label="Términos y condiciones">
              <textarea rows={4} className={inputCls} style={inputStyle}
                value={form.terminos}
                onChange={e => setF('terminos', e.target.value)} />
            </Field>
          </SectionCard>
        </div>

        {/* Columna derecha — resumen + IVA */}
        <div className="space-y-4">

          {/* IVA */}
          <div className="rounded-2xl border p-5 space-y-4"
            style={{ background: 'var(--hc-card)', borderColor: 'var(--hc-border)' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Impuesto</h2>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Aplicar IVA</span>
              <button
                onClick={() => setF('aplicaIva', !form.aplicaIva)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: form.aplicaIva ? 'var(--hc-accent)' : 'var(--hc-border)' }}>
                <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
                  style={{ transform: form.aplicaIva ? 'translateX(20px)' : 'translateX(0)' }} />
              </button>
            </div>

            {form.aplicaIva && (
              <Field label="Porcentaje IVA (%)">
                <input type="number" min={0} max={100} className={inputCls} style={inputStyle}
                  value={form.porcentajeIva}
                  onChange={e => setF('porcentajeIva', Number(e.target.value))} />
              </Field>
            )}
          </div>

          {/* Resumen de totales */}
          <div className="rounded-2xl border p-5 space-y-3 sticky top-6"
            style={{ background: 'var(--hc-card)', borderColor: 'var(--hc-border)' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Resumen</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between" style={{ color: 'var(--hc-text)' }}>
                <span>Subtotal</span>
                <span className="font-medium">{formatMonto(subtotal, form.moneda)}</span>
              </div>

              {form.aplicaIva && (
                <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
                  <span>IVA ({form.porcentajeIva}%)</span>
                  <span>{formatMonto(montoIva, form.moneda)}</span>
                </div>
              )}

              <div className="pt-2 mt-2 flex justify-between text-base font-bold border-t"
                style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>
                <span>Total</span>
                <span style={{ color: 'var(--hc-accent)' }}>{formatMonto(total, form.moneda)}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button onClick={guardar} disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--hc-accent)', color: '#fff' }}>
                {loading ? 'Guardando...' : esEdicion ? 'Actualizar cotización' : 'Crear cotización'}
              </button>
              <button onClick={() => navigate('/admin/cotizaciones')}
                className="w-full py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalCliente && (
        <ModalCliente
          onClose={() => setModalCliente(false)}
          onCreado={c => {
            setClientes(prev => [...prev, c])
            setF('clienteId', c.id)
            setModalCliente(false)
          }}
        />
      )}
    </div>
  )
}
