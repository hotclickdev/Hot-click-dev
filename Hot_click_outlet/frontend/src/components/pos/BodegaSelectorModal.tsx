import { useState, useEffect } from 'react'
import { posService } from '@/services/posService'
import TrustGlyph from '@/components/ui/TrustGlyph'
import TextoCamino from '@/components/ui/TextoCamino'
import { HotClickMark } from '@/components/ui/BrandLogo'
import type { Id } from '@/types/api'

type BodegaPos = {
  id: Id
  nombreBodega: string
  estado?: number
  direccionExacta?: string
  encargadoNombre?: string
}

/**
 * Pantalla bloqueante que exige seleccionar la bodega de operación al abrir el POS.
 *
 * - Plan Pro+ (maxBodegas > 1): se muestra siempre que no haya bodega en sesión.
 * - Plan Inicio Ferial (1 bodega): nunca se muestra — auto-selección en AdminPOS.
 *
 * @param {function} onSelect (bodegaId: number, bodegaNombre: string) => void
 */
export default function BodegaSelectorModal({ onSelect }: { onSelect: (bodegaId: Id, bodegaNombre: string) => void }) {
  const [bodegas,  setBodegas]  = useState<BodegaPos[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [selected, setSelected] = useState<Id | null>(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await posService.getBodegas() as BodegaPos[] | { data?: BodegaPos[] }
      const lista = (Array.isArray(res) ? res : (res?.data ?? [])).filter(b => b.estado === 1)
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

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmar = () => {
    const b = bodegas.find(b => b.id === selected)
    if (b) onSelect(b.id, b.nombreBodega)
  }

  /* ── Layout completo (reemplaza el POS entero mientras no hay selección) ── */
  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'var(--hc-bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}>
        <HotClickMark size={28} className="shrink-0" />
        <div>
          <p className="text-sm font-black" style={{ color: 'var(--hc-text)' }}>Caja POS</p>
          <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>Seleccioná la bodega de hoy</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-lg space-y-6">

          {/* Título */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
              style={{ backgroundColor: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
              <TrustGlyph tipo="edificio" className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight" style={{ color: 'var(--hc-text)' }}>
              ¿Desde qué bodega<br />operás hoy?
            </h1>
            <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
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
              <button type="button" onClick={cargar}
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
                  <button type="button" key={b.id} onClick={() => setSelected(b.id)}
                    className="w-full text-left rounded-2xl transition-all active:scale-[0.99]"
                    style={{
                      backgroundColor: activa ? 'rgba(23,71,168,0.15)' : 'var(--hc-surface-2)',
                      border: `2px solid ${activa ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                      padding: '16px 18px',
                    }}>
                    <div className="flex items-start gap-4">

                      {/* Ícono */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: activa ? 'rgba(23,71,168,0.22)' : 'var(--hc-surface)',
                          border: `1px solid ${activa ? 'rgba(23,71,168,0.5)' : 'var(--hc-border)'}`,
                          color: activa ? 'var(--hc-link)' : 'var(--hc-muted)',
                        }}>
                        <TrustGlyph tipo="edificio" className="w-6 h-6" />
                      </div>

                      {/* Datos */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-base font-bold leading-snug"
                          style={{ color: activa ? 'var(--hc-text)' : 'var(--hc-text)' }}>
                          {b.nombreBodega}
                        </p>
                        {b.direccionExacta && (
                          <p className="text-sm truncate"
                            style={{ color: 'var(--hc-muted)' }}>
                            {b.direccionExacta}
                          </p>
                        )}
                        {b.encargadoNombre && (
                          <p className="text-xs"
                            style={{ color: 'var(--hc-muted)' }}>
                            {b.encargadoNombre}
                          </p>
                        )}
                      </div>

                      {/* Checkmark */}
                      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                        style={{
                          backgroundColor: activa ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
                          border: `2px solid ${activa ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                          transition: 'all 0.15s ease',
                        }}>
                        {activa && <TrustGlyph tipo="check" className="w-3.5 h-3.5 text-white" />}
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
              style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
              <TrustGlyph tipo="paquete" className="w-10 h-10 mx-auto opacity-50" />
              <p className="font-bold" style={{ color: 'var(--hc-text)' }}>No hay bodegas activas</p>
              <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
                Creá al menos una bodega en <TextoCamino partes={['Configuración', 'Bodegas']} /> antes de usar el POS
              </p>
            </div>
          )}

          {/* CTA principal */}
          {!loading && !error && bodegas.length > 0 && (
            <button type="button"
              onClick={handleConfirmar}
              disabled={!selected}
              className="w-full rounded-2xl font-black text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                padding: '18px 0',
                background: selected ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
                color: '#fff',
                boxShadow: selected ? '0 8px 28px rgba(23,71,168,0.45)' : 'none',
                letterSpacing: '0.04em',
              }}>
              {selected
                ? 'Operar desde esta bodega'
                : 'Tocá una bodega para seleccionarla'}
            </button>
          )}

          <p className="text-center text-xs" style={{ color: 'var(--hc-muted)' }}>
            Podés cambiar la bodega desde el encabezado del POS en cualquier momento
          </p>
        </div>
      </div>
    </div>
  )
}
