import { useState, useEffect } from 'react'
import { crmService } from '@/services/crmService'
import { useToast } from '@/components/ui/Toast'
import ClienteDetailModal from '@/components/admin/ClienteDetailModal'
import { esInactivo30d } from './clientes/clientesHelpers'
import TextoMas from '@/components/ui/TextoMas'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

const SEG_META = {
  NUEVO:     { bg: 'rgba(96,165,250,0.12)',  text: '#6490EA' },
  FRECUENTE: { bg: 'rgba(52,211,153,0.12)', text: '#34d399' },
  VIP:       { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  INACTIVO:  { bg: 'rgba(255,255,255,0.06)', text: 'var(--hc-muted)' },
}

export default function AdminClientes() {
  const { showToast } = useToast()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [query, setQuery]       = useState('')
  const [filtroInactivos, setFiltroInactivos] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [showNuevo, setShowNuevo]   = useState(false)
  const [nombre, setNombre]     = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo]     = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const data = await crmService.listarClientes()
      setClientes(Array.isArray(data) ? data : [])
    } catch {
      showToast('Error al cargar clientes', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function crear() {
    if (!nombre.trim()) return
    setSaving(true)
    try {
      await crmService.crearCliente({ nombre: nombre.trim(), telefono: telefono.trim(), correo: correo.trim() })
      showToast('Cliente registrado', 'success')
      setNombre(''); setTelefono(''); setCorreo(''); setShowNuevo(false)
      cargar()
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al registrar cliente', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtrados = clientes.filter((c) => {
    if (filtroInactivos && !esInactivo30d(c)) return false
    if (query.trim().length < 2) return true
    const q = query.trim().toLowerCase()
    return (c.nombre ?? '').toLowerCase().includes(q)
      || (c.correo ?? '').toLowerCase().includes(q)
      || (c.telefono ?? '').includes(q)
  })
  const inactivosCount = clientes.filter(esInactivo30d).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Mis Clientes</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Tu libreta de contactos — se completa sola con cada venta, o agregalos vos mismo
          </p>
        </div>
        <button type="button" onClick={() => setShowNuevo(s => !s)}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          <TextoMas>Nuevo cliente</TextoMas>
        </button>
      </div>

      {showNuevo && (
        <div className="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre *"
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
          <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Teléfono"
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
          <input value={correo} onChange={e => setCorreo(e.target.value)} placeholder="Correo (opcional)"
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
          <button type="button" onClick={crear} disabled={!nombre.trim() || saving}
            className="sm:col-span-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: '#22c55e', color: '#fff' }}>
            {saving ? 'Guardando…' : 'Registrar cliente'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre, correo o teléfono…"
          className="w-full max-w-md px-3 py-2 rounded-xl text-sm outline-none"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
        <button type="button" onClick={() => setFiltroInactivos((v) => !v)}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold"
          style={filtroInactivos
            ? { backgroundColor: 'rgba(23,71,168,0.12)', border: '1px solid var(--hc-accent)', color: 'var(--hc-accent)' }
            : { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
          Inactivos 30d{inactivosCount > 0 ? ` (${inactivosCount})` : ''}
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando clientes…</div>
      ) : filtrados.length === 0 ? (
        <div className="py-12 text-center rounded-xl" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>
            {clientes.length === 0 ? 'Todavía no tenés clientes registrados' : 'Sin resultados'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            {clientes.length === 0 ? 'Agregalos con el botón de arriba o se suman solos cuando vendés en el POS.' : ''}
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
                {['Nombre', 'Contacto', 'Compras', 'Segmento'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => {
                const seg = SEG_META[c.segmento] ?? SEG_META.NUEVO
                return (
                  <tr key={c.id} onClick={() => setSelectedId(c.id)}
                    className="cursor-pointer hover:brightness-110 transition-all"
                    style={{ backgroundColor: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--hc-text)' }}>
                      {c.nombre} {c.apellidoPaterno}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                      {c.telefono}{c.correo ? ` · ${c.correo}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                      {fmt(c.totalComprasHist)} ({c.numPedidosHist ?? 0})
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: seg.bg, color: seg.text }}>
                        {c.segmento ?? 'NUEVO'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <ClienteDetailModal clienteId={selectedId} onClose={() => { setSelectedId(null); cargar() }} />
      )}
    </div>
  )
}
