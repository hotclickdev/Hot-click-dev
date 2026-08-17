import { formatMonto } from '@/services/cotizacionService'
import Field from './Field'
import ItemRow from './ItemRow'
import SectionCard from './SectionCard'
import { inputCls, inputStyle } from './nuevaCotizacionUi'

function FormHeader({ esEdicion, onCancelar }) {
  return (
    <div className="flex items-center gap-4">
      <button onClick={onCancelar}
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
  )
}

function SeccionCliente({ form, setF, clientes, onNuevoCliente }) {
  return (
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
        <button onClick={onNuevoCliente}
          className="px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap"
          style={{ color: 'var(--hc-accent)', borderColor: 'var(--hc-accent)' }}>
          + Nuevo cliente
        </button>
      </div>

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
  )
}

function SeccionDetalles({ form, setF }) {
  return (
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
  )
}

function SeccionItems({ items, productos, onChange, onRemove, onAgregar }) {
  return (
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
                onChange={onChange}
                onRemove={onRemove} />
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={onAgregar}
        className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: 'var(--hc-accent)', borderColor: 'var(--hc-accent)' }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        Agregar ítem
      </button>
    </SectionCard>
  )
}

function SeccionNotas({ form, setF }) {
  return (
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
  )
}

function SeccionTotales({ form, setF, subtotal, montoIva, total, loading, esEdicion, onGuardar, onCancelar }) {
  return (
    <div className="space-y-4">
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
          <button onClick={onGuardar} disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--hc-accent)', color: '#fff' }}>
            {loading ? 'Guardando...' : esEdicion ? 'Actualizar cotización' : 'Crear cotización'}
          </button>
          <button onClick={onCancelar}
            className="w-full py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CotizacionForm({
  esEdicion,
  form,
  setF,
  clientes,
  productos,
  items,
  actualizarItem,
  agregarItem,
  eliminarItem,
  onNuevoCliente,
  subtotal,
  montoIva,
  total,
  loading,
  onGuardar,
  onCancelar,
}) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <FormHeader esEdicion={esEdicion} onCancelar={onCancelar} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SeccionCliente form={form} setF={setF} clientes={clientes} onNuevoCliente={onNuevoCliente} />
          <SeccionDetalles form={form} setF={setF} />
          <SeccionItems
            items={items}
            productos={productos}
            onChange={actualizarItem}
            onRemove={eliminarItem}
            onAgregar={agregarItem}
          />
          <SeccionNotas form={form} setF={setF} />
        </div>

        <SeccionTotales
          form={form}
          setF={setF}
          subtotal={subtotal}
          montoIva={montoIva}
          total={total}
          loading={loading}
          esEdicion={esEdicion}
          onGuardar={onGuardar}
          onCancelar={onCancelar}
        />
      </div>
    </div>
  )
}
