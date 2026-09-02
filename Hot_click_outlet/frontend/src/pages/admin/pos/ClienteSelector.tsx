import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { crmService } from '@/services/crmService'
import { useToast } from '@/components/ui/Toast'
import { CloseIcon } from './posIcons'
import TextoMas from '@/components/ui/TextoMas'
import type { JsonBody } from '@/types/api'
import { mensajeErrorPos, type ClientePos, type ClienteSeleccionadoPos } from './posHelpers'
import PosReporteModal from './PosReporteModal'

export default function ClienteSelector({ cliente, onChange }: {
  cliente: ClienteSeleccionadoPos
  onChange: (c: ClienteSeleccionadoPos) => void
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [open, setOpen]     = useState(false)
  const [tab, setTab]       = useState('buscar') // 'buscar' | 'nuevo'
  const [query, setQuery]   = useState('')
  const [results, setResults] = useState<ClientePos[]>([])
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre]   = useState('')
  const [telefono, setTelefono] = useState('')
  const [creando, setCreando] = useState(false)
  const [falloRegistro, setFalloRegistro] = useState(false)
  const [reporteAbierto, setReporteAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!query || query.trim().length < 2) return
    const tmr = setTimeout(() => {
      setLoading(true)
      crmService.buscarClientes(query.trim())
        .then((data) => setResults(data as ClientePos[]))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(tmr)
  }, [query])

  const listaClientes = query.trim().length < 2 ? [] : results

  const seleccionar = (c: ClientePos) => {
    onChange({ id: c.id, nombre: c.nombre || c.correo || t('pos.cliente.fallbackNombre') })
    setOpen(false); setQuery(''); setResults([])
  }

  const crear = async () => {
    if (!nombre.trim()) return
    setCreando(true)
    setFalloRegistro(false)
    try {
      const nuevo = await crmService.crearCliente({ nombre: nombre.trim(), telefono: telefono.trim() } as JsonBody)
      seleccionar(nuevo as ClientePos)
      setNombre(''); setTelefono('')
      showToast(t('pos.cliente.toastRegistrado'), 'success')
    } catch (err: unknown) {
      showToast(mensajeErrorPos(err, t('pos.cliente.toastError')), 'error')
      setFalloRegistro(true)
    } finally {
      setCreando(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-stretch gap-1">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-colors"
        style={{
          backgroundColor: cliente ? 'rgba(23,71,168,0.1)' : 'var(--hc-surface-2)',
          border: `1px solid ${cliente ? 'rgba(23,71,168,0.3)' : 'var(--hc-border)'}`,
          color: cliente ? 'var(--hc-link)' : 'var(--hc-muted)',
        }}>
        <span className="flex items-center gap-1.5 truncate">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <span className="truncate font-medium">{cliente ? cliente.nombre : t('pos.cliente.mostrador')}</span>
        </span>
      </button>
        {cliente && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 px-2 rounded-xl opacity-60 hover:opacity-100"
            style={{
              backgroundColor: 'rgba(23,71,168,0.1)',
              border: '1px solid rgba(23,71,168,0.3)',
              color: 'var(--hc-link)',
            }}
            aria-label={t('pos.cliente.quitarAria')}
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1.5 rounded-xl overflow-hidden shadow-xl"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="flex border-b" style={{ borderColor: 'var(--hc-border)' }}>
            {([{ id: 'buscar', label: t('pos.cliente.tabBuscar') }, { id: 'nuevo', label: t('pos.cliente.tabNuevo'), mas: true }] as const).map(tabItem => (
              <button type="button" key={tabItem.id} onClick={() => setTab(tabItem.id)}
                className="flex-1 py-2 text-xs font-semibold transition-colors inline-flex items-center justify-center"
                style={{ color: tab === tabItem.id ? 'var(--hc-link)' : 'var(--hc-muted)' }}>
                {'mas' in tabItem && tabItem.mas ? <TextoMas>{tabItem.label}</TextoMas> : tabItem.label}
              </button>
            ))}
          </div>

          {tab === 'buscar' ? (
            <div className="p-2">
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder={t('pos.cliente.buscarPh')}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
              <div className="max-h-40 overflow-y-auto mt-1.5">
                {loading && <p className="text-xs text-center py-2" style={{ color: 'var(--hc-muted)' }}>{t('pos.cliente.buscando')}</p>}
                {!loading && query.trim().length >= 2 && results.length === 0 && (
                  <p className="text-xs text-center py-2" style={{ color: 'var(--hc-muted)' }}>{t('pos.cliente.sinResultados')}</p>
                )}
                {listaClientes.map(c => (
                  <button type="button" key={c.id} onClick={() => seleccionar(c)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[var(--hc-surface-2)] transition-colors">
                    <span className="font-medium" style={{ color: 'var(--hc-text)' }}>{c.nombre} {c.apellidoPaterno}</span>
                    <span className="ml-1.5" style={{ color: 'var(--hc-muted)' }}>{c.telefono}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder={t('pos.cliente.nombrePh')}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
              <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder={t('pos.cliente.telefonoPh')}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
              <button type="button" onClick={crear} disabled={!nombre.trim() || creando}
                className="w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                {creando ? t('pos.cliente.guardando') : t('pos.cliente.registrarUsar')}
              </button>
              {falloRegistro ? (
                <button
                  type="button"
                  onClick={() => setReporteAbierto(true)}
                  className="w-full py-1 text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
                  style={{ color: 'var(--hc-muted)' }}
                  aria-label={t('pos.reporte.botonAria')}
                >
                  {t('pos.header.reportar')}
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}

      <PosReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        pasoActual="cliente"
      />
    </div>
  )
}
