import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { garantiaService } from '@/services/garantiaService'
import type { GarantiaItem } from './serviciosHelpers'
import type { SyntheticEvent } from 'react'

function ShieldIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function PackageIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function WarnIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function SendIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

export default function GarantiaCard({ g, onReportado }: { g: GarantiaItem; onReportado?: () => void }) {
  const activa = g.activa
  const dias = g.diasRestantes
  const pct = activa ? Math.min(100, Math.round((Number(dias) / Number(g.garantiaDias)) * 100)) : 0
  let barColor = '#10b981'
  if (pct < 30) barColor = '#f59e0b'
  if (pct < 10) barColor = '#ef4444'
  if (!activa) barColor = 'var(--hc-muted)'

  const fechaVenc = new Date(g.fechaVencimiento ?? '').toLocaleDateString('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const [abierto, setAbierto] = useState(false)
  const [desc, setDesc] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errForm, setErrForm] = useState('')

  const handleReportar = async () => {
    if (!desc.trim()) { setErrForm('Describí el problema antes de enviar.'); return }
    setEnviando(true); setErrForm('')
    try {
      await garantiaService.crearSolicitud({
        productoId: g.productoId,
        pedidoId: g.pedidoId,
        descripcion: desc.trim(),
      })
      setEnviado(true)
      setDesc('')
      onReportado?.()
    } catch {
      setErrForm('No se pudo enviar. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--hc-surface)',
        border: `1px solid ${activa ? 'rgba(23,71,168,0.3)' : 'var(--hc-border)'}`,
      }}>

      <div className="px-4 py-2 flex items-center justify-between"
        style={{
          backgroundColor: activa ? 'rgba(23,71,168,0.08)' : 'rgba(107,114,128,0.08)',
          borderBottom: `1px solid ${activa ? 'rgba(23,71,168,0.15)' : 'var(--hc-border)'}`,
        }}>
        <span className="text-xs font-bold flex items-center gap-1.5"
          style={{ color: activa ? 'var(--hc-accent)' : 'var(--hc-muted)' }}>
          <ShieldIcon className="w-3.5 h-3.5" /> {activa ? 'Garantía activa' : 'Garantía vencida'}
        </span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: activa ? 'rgba(23,71,168,0.15)' : 'rgba(107,114,128,0.15)',
            color: activa ? 'var(--hc-accent)' : 'var(--hc-muted)',
          }}>
          No disponible
        </span>
      </div>

      <div className="p-4 flex gap-3">
        {g.imagenUrl ? (
          <img src={g.imagenUrl} alt={g.nombre}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            style={{ border: '1px solid var(--hc-border)' }}
            onError={(e: SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            <PackageIcon className="w-7 h-7" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug mb-1 truncate" style={{ color: 'var(--hc-text)' }}>
            {g.nombre}
          </p>
          <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>
            Pedido #{g.numeroPedido} · entregado {new Date(g.fechaEntrega ?? '').toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })}
          </p>
          <div className="h-1.5 rounded-full overflow-hidden mb-1.5"
            style={{ backgroundColor: 'var(--hc-surface-2)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: barColor }} />
          </div>
          <p className="text-xs font-medium" style={{ color: activa ? barColor : '#6b7280' }}>
            {textoVigenciaGarantia(!!activa, dias, fechaVenc)}
          </p>
        </div>
      </div>

      {activa && !enviado && (
        <div className="px-4 pb-4">
          <button type="button"
            onClick={() => setAbierto(v => !v)}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: abierto ? 'rgba(239,68,68,0.12)' : 'var(--hc-surface-2)',
              color: abierto ? '#ef4444' : 'var(--hc-muted)',
              border: `1px solid ${abierto ? 'rgba(239,68,68,0.3)' : 'var(--hc-border)'}`,
            }}>
            <WarnIcon className="w-4 h-4" /> {abierto ? 'Cancelar reporte' : 'Reportar problema'}
          </button>

          <AnimatePresence>
            {abierto && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden">
                <div className="pt-3 space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Describí el problema con el producto: qué pasó, cuándo empezó, qué probaste..."
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    className="w-full rounded-xl text-sm resize-none"
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--hc-surface-2)',
                      border: '1.5px solid var(--hc-border)',
                      color: 'var(--hc-text)',
                      outline: 'none',
                    }}
                  />
                  {errForm && (
                    <p className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                      <WarnIcon className="w-3.5 h-3.5" /> {errForm}
                    </p>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleReportar}
                    disabled={enviando}
                    className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                    {enviando
                      ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Enviando…</>
                      : <><SendIcon className="w-4 h-4" /> Enviar solicitud de garantía</>
                    }
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {enviado && (
        <div className="px-4 pb-4">
          <div className="py-3 px-4 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{ backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.25)' }}>
            <CheckIcon className="w-4 h-4" /> Solicitud enviada — HotClick te contactará pronto.
          </div>
        </div>
      )}
    </div>
  )
}

function textoVigenciaGarantia(activa: boolean, dias: number | undefined, fechaVenc: string) {
  if (!activa) return `Venció el ${fechaVenc}`
  const s = dias === 1 ? '' : 's'
  return `${dias} día${s} restante${s} · vence ${fechaVenc}`
}
