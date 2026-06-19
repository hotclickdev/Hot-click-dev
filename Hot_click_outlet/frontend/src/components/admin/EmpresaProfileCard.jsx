import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/services/api'

let _cached = null

function useEmpresaPerfil() {
  const [empresa, setEmpresa] = useState(_cached)
  const [loading, setLoading] = useState(!_cached)

  useEffect(() => {
    if (_cached) return
    api.get('/empresa/perfil')
      .then(r => {
        const e = r.data?.id ? r.data : (r.data?.data ?? r.data)
        _cached = e
        setEmpresa(e)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { empresa, loading }
}

function Popover({ empresa, totalProductos, onClose }) {
  const pais = empresa?.paisOperacion ?? ''
  const desc = empresa?.descripcion ?? ''
  const descVisible = desc.replace(/\[FOTOS\].*?(\[\/FOTOS\]|$)/s, '').trim()
  const logo = empresa?.logoUrl ?? ''
  const nombre = empresa?.nombreComercial ?? empresa?.nombreEmpresa ?? '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 top-full mt-2 right-0 w-72 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      style={{ background: '#16161b' }}
    >
      {/* Header con logo */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {logo ? (
          <img src={logo} alt={nombre} className="w-10 h-10 rounded-xl object-contain bg-white/5 border border-white/10 p-1 shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-[#4f7cff]/15 border border-[#4f7cff]/25 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#e8e8ed] truncate">{nombre}</p>
          {pais && (
            <p className="text-xs text-[#8e8e9a] flex items-center gap-1 mt-0.5">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {pais}
            </p>
          )}
        </div>
        <button onClick={onClose} className="ml-auto shrink-0 w-6 h-6 rounded-lg text-[#8e8e9a] hover:text-white hover:bg-white/8 flex items-center justify-center text-xs transition-colors">
          ✕
        </button>
      </div>

      {/* Descripción */}
      {descVisible && (
        <div className="px-4 pb-3">
          <p className="text-xs text-[#8e8e9a] line-clamp-3 leading-relaxed">
            {descVisible.slice(0, 160)}{descVisible.length > 160 ? '…' : ''}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="border-t border-white/8 px-4 py-3 flex items-center gap-4">
        <div className="text-center">
          <p className="text-base font-bold text-[#e8e8ed]">{totalProductos ?? '—'}</p>
          <p className="text-[10px] text-[#8e8e9a]">productos</p>
        </div>
        {empresa?.planSaas && (
          <div className="text-center">
            <p className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#4f7cff]/15 text-[#4f7cff] uppercase tracking-wide">
              {empresa.planSaas}
            </p>
            <p className="text-[10px] text-[#8e8e9a] mt-0.5">plan</p>
          </div>
        )}
        {empresa?.estadoEmpresa && (
          <div className="ml-auto">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              empresa.estadoEmpresa === 'ACTIVO' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            }`}>
              {empresa.estadoEmpresa === 'ACTIVO' ? 'activo' : empresa.estadoEmpresa.toLowerCase()}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Badge clicable que abre un mini-popover con el perfil de la empresa.
 * totalProductos: número de productos ya cargados en la página (opcional).
 */
export default function EmpresaProfileCard({ totalProductos, className = '' }) {
  const { empresa, loading } = useEmpresaPerfil()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/8 bg-white/3 animate-pulse ${className}`}>
        <div className="w-5 h-5 rounded-lg bg-white/10" />
        <div className="w-20 h-3 rounded bg-white/10" />
      </div>
    )
  }

  if (!empresa) return null

  const nombre = empresa.nombreComercial ?? empresa.nombreEmpresa ?? '—'
  const logo = empresa.logoUrl ?? ''

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all text-sm group"
        title="Ver perfil de la cuenta"
      >
        {logo ? (
          <img src={logo} alt={nombre} className="w-5 h-5 rounded-lg object-contain" />
        ) : (
          <div className="w-5 h-5 rounded-lg bg-[#4f7cff]/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
        )}
        <span className="text-[#e8e8ed] font-medium text-xs max-w-[140px] truncate">{nombre}</span>
        <svg className={`w-3 h-3 text-[#8e8e9a] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <Popover empresa={empresa} totalProductos={totalProductos} onClose={() => setOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
