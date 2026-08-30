import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { crmService } from '@/services/crmService'
import { useToast } from '@/components/ui/Toast'
import ClienteDetailModal from '@/components/admin/ClienteDetailModal'
import { formatPrice } from '@/utils/format'
import Spinner from '@/components/ui/Spinner'
import TextoFlecha from '@/components/ui/TextoFlecha'
import TextoMas from '@/components/ui/TextoMas'
import { mensajeErrorProducto } from './productos/productosHelpers'
import type { Id } from '@/types/api'
import type { ClienteDetalle } from '@/components/admin/clienteDetail/useClienteDetailModal'

const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'

type ClienteSistema = ClienteDetalle & {
  id: Id
  ultimaCompra?: string
  fechaUltimoAcceso?: string
}

/**
 * Clientes del dueño — tarjetas, no tabla CRM de admin.
 */
export default function SistemaClientes() {
  const { showToast } = useToast()
  const [clientes, setClientes] = useState<ClienteSistema[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<Id | null>(null)
  const [showNuevo, setShowNuevo] = useState(false)

  const cargar = () => {
    setLoading(true)
    crmService.listarClientes()
      .then((data: unknown) => setClientes(Array.isArray(data) ? data as ClienteSistema[] : []))
      .catch(() => showToast('No se pudieron cargar los clientes', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- carga al montar

  const q = query.trim().toLowerCase()
  const filtrados = q.length < 2
    ? clientes
    : clientes.filter((c) => coincideCliente(c, q))

  return (
    <div className="max-w-[1060px]">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold mb-4" style={{ color: 'var(--hc-text)' }}>
        <TextoFlecha dir="atras">Inicio</TextoFlecha>
      </Link>
      <header className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight m-0" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>Clientes</h1>
          <p className="text-[15px] m-0 mt-1" style={{ color: '#6b6459' }}>{textoConteoClientes(clientes.length)}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNuevo((v) => !v)}
          className="inline-flex items-center justify-center px-[22px] py-[13px] rounded-[10px] text-[15px] font-bold"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          <TextoMas>Agregá un cliente</TextoMas>
        </button>
      </header>

      {showNuevo && <FormNuevoCliente onCreado={() => { setShowNuevo(false); cargar() }} />}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscá por nombre o teléfono…"
        className="w-full max-w-[380px] px-3.5 py-3 rounded-[10px] text-[15px] mb-4 focus:outline-none"
        style={{ border: '1px solid #d8cfc0', backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}
      />

      {loading && <div className="flex justify-center py-16"><Spinner size="lg" /></div>}
      {!loading && filtrados.length === 0 && (
        <p className="text-sm py-12 text-center" style={{ color: '#6b6459' }}>
          {clientes.length === 0
            ? 'Todavía no registraste clientes. Se agregan solos cuando alguien compra, o creá uno ahora.'
            : 'Nadie coincide con esa búsqueda.'}
        </p>
      )}
      {!loading && filtrados.length > 0 && (
        <section className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {filtrados.map((c) => (
            <TarjetaCliente key={c.id} cliente={c} onVer={() => setSelectedId(c.id)} />
          ))}
        </section>
      )}

      {selectedId && (
        <ClienteDetailModal clienteId={selectedId} onClose={() => { setSelectedId(null); cargar() }} />
      )}
    </div>
  )
}

function FormNuevoCliente({ onCreado }: { onCreado: () => void }) {
  const { showToast } = useToast()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [saving, setSaving] = useState(false)
  const inputStyle = { border: '1px solid #d8cfc0', backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }

  const crear = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    try {
      await crmService.crearCliente({ nombre: nombre.trim(), telefono: telefono.trim(), correo: correo.trim() })
      showToast('Cliente registrado', 'success')
      onCreado()
    } catch (err: unknown) {
      showToast(mensajeErrorProducto(err, 'Error al registrar cliente'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={crear} className="rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" required className="px-3 py-2.5 rounded-[10px] text-sm focus:outline-none" style={inputStyle} />
      <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" className="px-3 py-2.5 rounded-[10px] text-sm focus:outline-none" style={inputStyle} />
      <input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Correo (opcional)" type="email" className="px-3 py-2.5 rounded-[10px] text-sm focus:outline-none" style={inputStyle} />
      <button type="submit" disabled={saving} className="sm:col-span-3 py-2.5 rounded-[10px] text-sm font-bold disabled:opacity-50" style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}>
        {saving ? 'Guardando…' : 'Guardá el cliente'}
      </button>
    </form>
  )
}

function TarjetaCliente({ cliente, onVer }: { cliente: ClienteSistema; onVer: () => void }) {
  const nombre = `${cliente.nombre ?? ''} ${cliente.apellidoPaterno ?? ''}`.trim() || 'Sin nombre'
  const compras = cliente.numPedidosHist ?? 0
  return (
    <article className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: 'rgba(23,71,168,0.08)', color: 'var(--hc-accent)' }}>
          {iniciales(nombre)}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold m-0 truncate" style={{ color: 'var(--hc-text)' }}>{nombre}</p>
          <p className="text-[13px] m-0" style={{ color: '#6b6459' }}>{cliente.telefono || 'Sin teléfono'}</p>
        </div>
      </div>
      <div className="flex justify-between text-[13px] pt-2.5" style={{ borderTop: '1px solid #f0e9dd', color: '#6b6459' }}>
        <span>{compras} {compras === 1 ? 'compra' : 'compras'}</span>
        <span>Última: {textoUltima(cliente)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>{formatPrice(cliente.totalComprasHist)}</span>
        <button type="button" onClick={onVer} className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>
          <TextoFlecha>Vé más</TextoFlecha>
        </button>
      </div>
    </article>
  )
}

function coincideCliente(c: ClienteSistema, q: string) {
  return [c.nombre, c.apellidoPaterno, c.telefono, c.correo].some((v) => String(v ?? '').toLowerCase().includes(q))
}

function textoConteoClientes(n: number) {
  if (n === 0) return 'Todavía no te han comprado.'
  if (n === 1) return '1 cliente te ha comprado.'
  return `${n} clientes te han comprado.`
}

function iniciales(nombre: string) {
  const partes = nombre.split(' ').filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

function textoUltima(c: ClienteSistema) {
  const fecha = c.ultimaCompra ?? c.fechaUltimoAcceso
  if (!fecha) return '—'
  const d = new Date(fecha)
  const hoy = new Date()
  if (d.toDateString() === hoy.toDateString()) return 'hoy'
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  if (d.toDateString() === ayer.toDateString()) return 'ayer'
  return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
}
