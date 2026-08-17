import Field from './Field'
import SectionCard from './SectionCard'
import { inputCls, inputStyle } from './nuevaCotizacionUi'

/**
 * Selector y ficha del cliente de la cotización.
 */
export default function SeccionCliente({ form, setF, clientes, onNuevoCliente }) {
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
        <button type="button" onClick={onNuevoCliente}
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
