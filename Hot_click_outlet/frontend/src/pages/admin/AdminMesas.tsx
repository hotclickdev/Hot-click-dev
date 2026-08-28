import { useState, useEffect, useRef, type FormEvent } from 'react'
import QRCode from 'react-qr-code'
import { mesaService } from '@/services/mesaService'
import TrustGlyph from '@/components/ui/TrustGlyph'
import TextoMas from '@/components/ui/TextoMas'
import type { Id, JsonBody } from '@/types/api'

type TipoMesa = 'MESA' | 'KIOSK' | 'ESTANTE' | 'MOSTRADOR' | 'ZONA'

type MesaAdmin = {
  id: Id
  nombre: string
  descripcion?: string
  tipo?: string
  qrToken?: string
  activo?: boolean
}

type FormMesa = { nombre: string; descripcion: string; tipo: TipoMesa }

function mensajeErrorMesa(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const error = (err as { response?: { data?: { error?: unknown } } }).response?.data?.error
  return typeof error === 'string' && error ? error : fallback
}

const TIPOS: TipoMesa[] = ['MESA', 'KIOSK', 'ESTANTE', 'MOSTRADOR', 'ZONA']
const TIPO_GLIFO: Record<string, string> = { MESA: 'silla', KIOSK: 'monitor', ESTANTE: 'lista', MOSTRADOR: 'edificio', ZONA: 'pin' }

const APP_URL = globalThis.location?.origin ?? ''

function qrUrl(token: string | undefined) {
  return `${APP_URL}/checkout/qr/${token}`
}

function QrModal({ mesa, onClose }: { mesa: MesaAdmin; onClose: () => void }) {
  const url = qrUrl(mesa.qrToken)
  const svgRef = useRef<HTMLDivElement>(null)

  function imprimir() {
    const svgEl = svgRef.current?.querySelector('svg')
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url2 = URL.createObjectURL(blob)
    const win = globalThis.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>QR ${mesa.nombre}</title>
      <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fff}
      h2{margin-bottom:16px;font-size:20px}p{margin-top:12px;font-size:12px;color:#666;word-break:break-all;max-width:300px;text-align:center}
      </style></head><body>
      <h2>${mesa.nombre}</h2>
      <img src="${url2}" width="300" height="300"/>
      <p>${url}</p>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="rounded-2xl p-6 max-w-sm w-full flex flex-col items-center gap-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        onClick={e => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>{mesa.nombre}</h3>
        <div ref={svgRef} className="p-4 rounded-xl bg-white">
          <QRCode value={url} size={220} />
        </div>
        <p className="text-xs text-center break-all" style={{ color: 'var(--hc-muted)' }}>{url}</p>
        <div className="flex gap-3 w-full">
          <button type="button" onClick={imprimir}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            Imprimir / Descargar
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm transition-opacity hover:opacity-70"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminMesas() {
  const [mesas, setMesas]           = useState<MesaAdmin[]>([])
  const [cargando, setCargando]     = useState(true)
  const [qrMesa, setQrMesa]         = useState<MesaAdmin | null>(null)
  const [form, setForm]             = useState<FormMesa>({ nombre: '', descripcion: '', tipo: 'MESA' })
  const [creando, setCreando]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function cargar() {
    setCargando(true)
    try {
      const { data } = await mesaService.getAll()
      setMesas(Array.isArray(data) ? data as MesaAdmin[] : [])
    } catch { setError('No se pudieron cargar las mesas') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  async function crear(e: FormEvent) {
    e.preventDefault()
    setCreando(true); setError(null)
    try {
      await mesaService.create(form as JsonBody)
      setForm({ nombre: '', descripcion: '', tipo: 'MESA' })
      setMostrarForm(false)
      await cargar()
    } catch (err: unknown) {
      setError(mensajeErrorMesa(err, 'Error al crear la mesa'))
    } finally { setCreando(false) }
  }

  async function toggleActivo(mesa: MesaAdmin) {
    try {
      await mesaService.update(mesa.id, { activo: !mesa.activo })
      await cargar()
    } catch { setError('Error al actualizar') }
  }

  async function regenerarToken(mesa: MesaAdmin) {
    if (!confirm('¿Regenerar el QR? El QR anterior dejará de funcionar.')) return
    try {
      await mesaService.regenerarToken(mesa.id)
      await cargar()
    } catch { setError('Error al regenerar') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Mesas / QR Autoservicio</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Genera códigos QR para que los clientes realicen pedidos desde su teléfono
          </p>
        </div>
        <button type="button" onClick={() => setMostrarForm(v => !v)}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 inline-flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          <TextoMas>Nueva mesa</TextoMas>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={crear} className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Nueva mesa</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input required placeholder="Nombre (ej: Mesa 1)"
              value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            <input placeholder="Descripción (opcional)"
              value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TipoMesa }))}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creando}
              className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
              {creando ? 'Creando…' : 'Crear'}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)}
              className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--hc-muted)' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        </div>
      ) : mesas.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--hc-muted)' }}>
          <div className="flex justify-center mb-3 opacity-40">
            <TrustGlyph tipo="silla" className="w-10 h-10" />
          </div>
          <p className="font-medium">No hay mesas configuradas</p>
          <p className="text-sm mt-1">Crea una mesa para generar su código QR</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mesas.map(m => (
            <div key={m.id} className="rounded-2xl p-4 space-y-3 relative"
              style={{
                backgroundColor: 'var(--hc-surface)',
                border: `1px solid ${m.activo ? 'var(--hc-border)' : 'rgba(156,163,175,0.2)'}`,
                opacity: m.activo ? 1 : 0.6,
              }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm flex items-center gap-1.5" style={{ color: 'var(--hc-text)' }}>
                    <TrustGlyph tipo={TIPO_GLIFO[m.tipo ?? ''] ?? 'pin'} className="w-3.5 h-3.5" />
                    {m.nombre}
                  </p>
                  {m.descripcion && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{m.descripcion}</p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${m.activo ? 'text-green-400 bg-green-400/10' : 'text-gray-400 bg-gray-400/10'}`}>
                  {m.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="flex items-center justify-center p-3 rounded-xl bg-white">
                <QRCode value={qrUrl(m.qrToken)} size={120} />
              </div>

              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setQrMesa(m)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                  Ver QR
                </button>
                <a href="/productos" target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
                  Menú digital
                </a>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => toggleActivo(m)}
                  className="flex-1 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
                  style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                  {m.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button type="button" onClick={() => regenerarToken(m)}
                  className="flex-1 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
                  style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                  title="Genera un nuevo QR — el anterior deja de funcionar">
                  Nuevo QR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrMesa && <QrModal mesa={qrMesa} onClose={() => setQrMesa(null)} />}
    </div>
  )
}
