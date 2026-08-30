import { useState, useEffect, useRef } from 'react'
import { inp, inpStyle } from './productFormUi'
import CloseIcon from '@/components/ui/CloseIcon'
import TextoMas from '@/components/ui/TextoMas'
import type { Dispatch, SetStateAction } from 'react'
import type { WizardMarca } from './wizardHelpers'

export default function MarcaCombobox({ marcas, value, onChange, showNuevaMarca, setShowNuevaMarca, nuevaMarca, setNuevaMarca, creandoMarca, onCrear }: {
  marcas: WizardMarca[]
  value: string
  onChange: (v: string) => void
  showNuevaMarca: boolean
  setShowNuevaMarca: Dispatch<SetStateAction<boolean>>
  nuevaMarca: string
  setNuevaMarca: Dispatch<SetStateAction<string>>
  creandoMarca: boolean
  onCrear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = marcas.find(m => String(m.id) === String(value))
  const filtered = marcas.filter(m => m.nombreMarca.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (showNuevaMarca) {
    return (
      <div className="flex gap-2">
        <input className={inp} style={inpStyle} value={nuevaMarca} onChange={e => setNuevaMarca(e.target.value)}
          placeholder="Nombre de la nueva marca"
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onCrear())}
          autoFocus />
        <button type="button" onClick={onCrear} disabled={creandoMarca || !nuevaMarca.trim()}
          className="shrink-0 px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-opacity" style={{ backgroundColor: 'var(--hc-accent)' }}>
          {creandoMarca ? '...' : 'Crear'}
        </button>
        <button type="button" onClick={() => setShowNuevaMarca(false)}
          className="shrink-0 px-3 py-2 rounded-xl text-sm" style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
          aria-label="Cancelar">
          <CloseIcon />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className={`${inp} flex items-center justify-between w-full text-left`} style={inpStyle}>
        <span style={{ color: selected ? 'var(--hc-text)' : 'var(--hc-muted)' }}>
          {selected ? selected.nombreMarca : '-- Sin marca --'}
        </span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--hc-muted)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-xl shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="p-2" style={{ borderBottom: '1px solid var(--hc-border)' }}>
            <input className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inpStyle}
              placeholder="Buscar marca…" value={search} onChange={e => setSearch(e.target.value)}
              autoFocus onClick={e => e.stopPropagation()} />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--hc-surface-2)]" style={{ color: 'var(--hc-muted)' }}>
              -- Sin marca --
            </button>
            {filtered.map(m => (
              <button key={m.id} type="button" onClick={() => { onChange(String(m.id)); setOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--hc-surface-2)]"
                style={String(m.id) === String(value) ? { backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)' } : { color: 'var(--hc-text)' }}>
                {m.nombreMarca}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-4 py-3 text-sm" style={{ color: 'var(--hc-muted)' }}>Sin resultados</p>}
          </div>
          <div className="p-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
            <button type="button" onClick={() => { setShowNuevaMarca(true); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-[rgba(23,71,168,0.08)] inline-flex items-center" style={{ color: 'var(--hc-accent)' }}>
              <TextoMas>Crear nueva marca</TextoMas>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
