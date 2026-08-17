import EventosCheckbox from './EventosCheckbox'

export default function PluginForm({
  editando,
  form,
  guardando,
  onSubmit,
  onCancel,
  setStr,
  setField,
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl p-5 space-y-4"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-accent)' }}>
      <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>
        {editando ? `Editar: ${editando.nombre}` : 'Nuevo plugin'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Nombre *</label>
          <input required value={form.nombre} onChange={setStr('nombre')} placeholder="Mi integración"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
        </div>
        <div className="space-y-1">
          <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Tipo</label>
          <select value={form.tipo} onChange={setStr('tipo')}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            <option value="WEBHOOK">Webhook (HTTP POST)</option>
            <option value="IFRAME">Iframe (panel embebido)</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          {form.tipo === 'WEBHOOK' ? 'URL del endpoint *' : 'URL del iframe *'}
        </label>
        <input required value={form.url} onChange={setStr('url')}
          placeholder={form.tipo === 'WEBHOOK' ? 'https://mi-servicio.com/webhook' : 'https://app.servicio.com/embed?token=xxx'}
          className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
          style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
      </div>

      {form.tipo === 'WEBHOOK' && (
        <>
          <div className="space-y-2">
            <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Eventos suscritos</label>
            <EventosCheckbox value={form.eventosSuscritos} onChange={setField('eventosSuscritos')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              Secreto HMAC (para verificar firma — dejar vacío para no firmar)
            </label>
            <input type="password" value={form.secretoHmac} onChange={setStr('secretoHmac')}
              placeholder={editando?.tieneSecretoHmac ? '••••••• (mantener vacío para no cambiar)' : 'secreto-opcional'}
              className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>
              Header enviado: <code>X-HotClick-Signature: sha256=&lt;hmac&gt;</code>
            </p>
          </div>
        </>
      )}

      <div className="space-y-1">
        <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Descripción (opcional)</label>
        <input value={form.descripcion} onChange={setStr('descripcion')} placeholder="Para qué sirve este plugin"
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={guardando}
          className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--hc-muted)' }}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
