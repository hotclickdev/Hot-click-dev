import { useState } from 'react'
import HojaInferior from '@/components/comprador/HojaInferior'

type Props = {
  desde: string
  hasta: string
  onChange: (desde: string, hasta: string) => void
}

function iso(fecha: Date) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

function haceDias(dias: number) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  return iso(fecha)
}

function aIso(texto: string) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim())
  if (!partes) return ''
  return `${partes[3]}-${partes[2]}-${partes[1]}`
}

const CHIPS = [
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: '7', etiqueta: '7 días' },
  { id: '30', etiqueta: '30 días' },
  { id: 'custom', etiqueta: 'Personalizado' },
] as const

/** Chips de período (D2-22). Personalizado abre una hoja en dd/mm/aaaa. */
export default function ChipsPeriodo({ desde, hasta, onChange }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [textoDesde, setTextoDesde] = useState('')
  const [textoHasta, setTextoHasta] = useState('')
  const hoy = iso(new Date())

  function elegir(id: (typeof CHIPS)[number]['id']) {
    if (id === 'custom') {
      setAbierta(true)
      return
    }
    if (id === 'hoy') onChange(hoy, hoy)
    if (id === '7') onChange(haceDias(6), hoy)
    if (id === '30') onChange(haceDias(29), hoy)
  }

  function aplicar() {
    const inicio = aIso(textoDesde)
    const fin = aIso(textoHasta)
    if (!inicio || !fin) return
    onChange(inicio, fin)
    setAbierta(false)
  }

  const activo = (id: (typeof CHIPS)[number]['id']) => {
    if (id === 'hoy') return desde === hoy && hasta === hoy
    if (id === '7') return desde === haceDias(6) && hasta === hoy
    if (id === '30') return desde === haceDias(29) && hasta === hoy
    return Boolean(desde && hasta) && id === 'custom'
  }

  return (
    <div className="md:hidden">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={activo(chip.id)}
            onClick={() => elegir(chip.id)}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium ${
              activo(chip.id) ? 'border-hc-n-900 bg-hc-n-900 text-white' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'
            }`}
          >
            {chip.etiqueta}
          </button>
        ))}
      </div>
      <HojaInferior abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Período">
        <div className="flex flex-col gap-3 p-4">
          <label className="text-sm text-hc-n-600">
            Desde
            <input value={textoDesde} onChange={(e) => setTextoDesde(e.target.value)} inputMode="numeric" placeholder="dd/mm/aaaa" className="mt-1 w-full rounded-xl border border-hc-n-200 px-3 py-3 text-base" />
          </label>
          <label className="text-sm text-hc-n-600">
            Hasta
            <input value={textoHasta} onChange={(e) => setTextoHasta(e.target.value)} inputMode="numeric" enterKeyHint="done" placeholder="dd/mm/aaaa" className="mt-1 w-full rounded-xl border border-hc-n-200 px-3 py-3 text-base" />
          </label>
          <button type="button" onClick={aplicar} className="min-h-12 rounded-[12px] bg-hc-red-500 text-[15px] font-semibold text-white">
            Aplicar
          </button>
        </div>
      </HojaInferior>
    </div>
  )
}
