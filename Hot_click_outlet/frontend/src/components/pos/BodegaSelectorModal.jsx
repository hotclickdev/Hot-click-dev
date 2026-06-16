import { useState, useEffect } from 'react'
import { posService } from '@/services/posService'

/**
 * Pantalla bloqueante que exige seleccionar la bodega de operación al abrir el POS.
 *
 * - Plan Pro+ (maxBodegas > 1): se muestra siempre que no haya bodega en sesión.
 * - Plan Inicio Ferial (1 bodega): nunca se muestra — auto-selección en AdminPOS.
 *
 * @param {function} onSelect (bodegaId: number, bodegaNombre: string) => void
 */
export default function BodegaSelectorModal({ onSelect }) {
  const [bodegas,  setBodegas]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [selected, setSelected] = useState(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await posService.getBodegas()
      const lista = (res?.data ?? []).filter(b => b.estado === 1)
      setBodegas(lista)
      if (lista.length === 1) {
        // Safety net: si llegó una sola, auto-selecciona sin mostrar la pantalla
        onSelect(lista[0].id, lista[0].nombreBodega)
      }
    } catch {
      setError('No se pudieron cargar las bodegas. Revisá la conexión.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line

  const handleConfirmar = () => {
    const b = bodegas.find(b => b.id === selected)
    if (b) onSelect(b.id, b.nombreBodega)
  }

  /* ── Layout completo (reemplaza el POS entero mientras no hay selección) ── */
  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: '#08080c', fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0c0c12' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}>HC</div>
        <div>
          <p className="text-sm font-black" style={{ color: '#fff' }}>Caja POS</p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Seleccioná la bodega de hoy</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-lg space-y-6">

          {/* Título */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl"
              style={{ backgroundColor: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
              🏭
            </div>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight" style={{ color: '#fff' }}>
              ¿Desde qué bodega<br />operás hoy?
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              El stock se descontará de esta bodega en cada venta
            </p>
          </div>

          {/* Spinner */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-2xl p-5 text-center space-y-4"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-sm font-semibold" style={{ color: '#f87171' }}>{error}</p>
              <button onClick={cargar}
                className="px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:brightness-110"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                Reintentar
              </button>
            </div>
          )}

          {/* Lista de bodegas */}
          {!loading && !error && bodegas.length > 0 && (
            <div className="space-y-3">
              {bodegas.map(b => {
                const activa = selected === b.id
                return (
                  <button key={b.id} onClick={() => setSelected(b.id)}
                    className="w-full text-left rounded-2xl transition-all active:scale-[0.99]"
                    style={{
                      backgroundColor: activa ? 'rgba(23,71,168,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${activa ? 'var(--hc-accent)' : 'rgba(255,255,255,0.09)'}`,
                      padding: '16px 18px',
                    }}>
                    <div className="flex items-start gap-4">

                      {/* Ícono */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{
                          backgroundColor: activa ? 'rgba(23,71,168,0.22)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${activa ? 'rgba(23,71,168,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        }}>
                        🏭
                      </div>

                      {/* Datos */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-base font-bold leading-snug"
                          style={{ color: activa ? '#fff' : 'rgba(255,255,255,0.85)' }}>
                          {b.nombreBodega}
                        </p>
                        {b.direccionExacta && (
                          <p className="text-sm truncate"
                            style={{ color: 'rgba(255,255,255,0.38)' }}>
                            📍 {b.direccionExacta}
                          </p>
                        )}
                        {b.encargadoNombre && (
                          <p className="text-xs"
                            style={{ color: 'rgba(255,255,255,0.28)' }}>
                            👤 {b.encargadoNombre}
                          </p>
                        )}
                      </div>

                      {/* Checkmark */}
                      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                        style={{
                          backgroundColor: activa ? 'var(--hc-accent)' : 'rgba(255,255,255,0.07)',
                          border: `2px solid ${activa ? 'var(--hc-accent)' : 'rgba(255,255,255,0.18)'}`,
                          transition: 'all 0.15s ease',
                        }}>
                        {activa && <span className="text-white text-xs font-black leading-none">✓</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Sin bodegas */}
          {!loading && !error && bodegas.length === 0 && (
            <div className="rounded-2xl p-8 text-center space-y-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-4xl">📦</p>
              <p className="font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>No hay bodegas activas</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Creá al menos una bodega en Configuración → Bodegas antes de usar el POS
              </p>
            </div>
          )}

          {/* CTA principal */}
          {!loading && !error && bodegas.length > 0 && (
            <button
              onClick={handleConfirmar}
              disabled={!selected}
              className="w-full rounded-2xl font-black text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                padding: '18px 0',
                background: selected ? 'var(--hc-accent)' : 'rgba(255,255,255,0.06)',
                color: '#fff',
                boxShadow: selected ? '0 8px 28px rgba(23,71,168,0.45)' : 'none',
                letterSpacing: '0.04em',
              }}>
              {selected
                ? `✓  Operar desde esta bodega`
                : 'Tocá una bodega para seleccionarla'}
            </button>
          )}

          <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Podés cambiar la bodega desde el encabezado del POS en cualquier momento
          </p>
        </div>
      </div>
    </div>
  )
}
