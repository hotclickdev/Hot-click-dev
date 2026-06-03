import { useState, useEffect, useCallback } from 'react'
import { getColaCompleta, actualizarEstado } from '@/db/offlineDb'
import { procesarCola, descartarItem } from '@/services/syncService'
import { useOffline } from '@/hooks/useOffline'

const ESTADO_STYLE = {
  PENDIENTE:     { label: 'Pendiente',     color: '#fbbf24', bg: '#78350f22' },
  SINCRONIZANDO: { label: 'Sincronizando', color: '#60a5fa', bg: '#1e3a5f22' },
  OK:            { label: 'Sincronizado',  color: '#22c55e', bg: '#16a34a22' },
  ERROR:         { label: 'Error',         color: '#f87171', bg: '#7f1d1d22' },
  CONFLICTO:     { label: 'Conflicto',     color: '#fb923c', bg: '#78350f22' },
}

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] ?? { label: estado, color: '#9ca3af', bg: 'transparent' }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  )
}

const TIPO_LABEL = {
  VENTA_POS:     'Venta POS',
  PEDIDO_MANUAL: 'Pedido manual',
  AJUSTE_STOCK:  'Ajuste de stock',
}

export default function AdminOfflineCola() {
  const [cola, setCola]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const { isOnline, pendientes } = useOffline()

  const cargar = useCallback(async () => {
    setCargando(true)
    setCola(await getColaCompleta())
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function sincronizar() {
    setSyncing(true)
    await procesarCola()
    await cargar()
    setSyncing(false)
  }

  async function descartar(id) {
    if (!confirm('¿Descartar esta operación? No se podrá recuperar.')) return
    await descartarItem(id)
    await cargar()
  }

  async function reintentar(item) {
    await actualizarEstado(item.id, 'PENDIENTE', null)
    await cargar()
  }

  const fmt = (iso) => new Date(iso).toLocaleString('es-CR')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Cola offline</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Operaciones registradas mientras no había conexión
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
            <span style={{ color: 'var(--hc-muted)' }}>{isOnline ? 'En línea' : 'Sin conexión'}</span>
          </div>
          {pendientes > 0 && isOnline && (
            <button
              onClick={sincronizar}
              disabled={syncing}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
            >
              {syncing ? 'Sincronizando…' : `Sincronizar (${pendientes})`}
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        </div>
      ) : cola.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--hc-muted)' }}>
          <div className="text-4xl mb-3">✓</div>
          <p className="font-medium">Cola vacía — todo sincronizado</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          {cola.map((item) => (
            <div key={item.id}
              className="flex items-start gap-4 px-5 py-4 border-b last:border-0"
              style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <EstadoBadge estado={item.estado} />
                  <span className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
                    {TIPO_LABEL[item.tipo] ?? item.tipo}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {item.method} {item.endpoint}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  Creado: {fmt(item.creadoAt)} · Intento {item.intentos} de {3}
                </p>
                {item.errorDetalle && (
                  <p className="text-xs px-2 py-1 rounded-lg mt-1"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                    {item.errorDetalle}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {(item.estado === 'ERROR' || item.estado === 'CONFLICTO') && (
                  <button
                    onClick={() => reintentar(item)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  >
                    Reintentar
                  </button>
                )}
                {item.estado !== 'OK' && (
                  <button
                    onClick={() => descartar(item.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}
                  >
                    Descartar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
