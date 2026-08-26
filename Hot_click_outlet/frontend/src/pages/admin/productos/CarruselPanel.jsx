import CloseIcon from '@/components/ui/CloseIcon'
import TrustGlyph from '@/components/ui/TrustGlyph'

const SLOT_COLORES = ['rgba(23,71,168,0.1)', 'rgba(122,163,255,0.1)', 'rgba(30,127,79,0.1)', 'rgba(245,158,11,0.1)', 'rgba(220,38,38,0.08)']
const SLOT_BORDES = ['rgba(23,71,168,0.3)', 'rgba(122,163,255,0.3)', 'rgba(30,127,79,0.3)', 'rgba(245,158,11,0.3)', 'rgba(220,38,38,0.25)']
const CARRUSEL_SLOTS = 5

function BoxIcon({ className }) {
  return (
    <svg className={className} style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    </svg>
  )
}

function CarruselSlotOcupado({ slot, index, total, onMover, onQuitar }) {
  return (
    <>
      <div className="flex-1 flex items-center justify-center pt-6 pb-2 px-2">
        {slot.imagenUrl ? (
          <img src={slot.imagenUrl} alt={slot.nombre} className="w-16 h-16 object-contain" style={{ filter: 'drop-shadow(0 4px 12px rgba(26,26,26,0.15))' }} />
        ) : (
          <BoxIcon className="w-16 h-16" />
        )}
      </div>
      <div className="px-2 pb-2">
        <p className="text-[10px] font-medium text-center line-clamp-1" style={{ color: 'var(--hc-text)' }}>{slot.nombre}</p>
      </div>
      <div className="flex items-center justify-between px-1.5 pb-1.5 gap-1">
        <button type="button"
          onClick={() => onMover(slot, -1)}
          disabled={index === 0}
          aria-label="Mover a la izquierda"
          className="flex-1 h-6 rounded-lg transition-colors hover:bg-[var(--hc-surface)] disabled:opacity-30"
          style={{ color: 'var(--hc-muted)' }}
        ><TrustGlyph tipo="atras" className="w-3.5 h-3.5 mx-auto" /></button>
        <button type="button"
          onClick={() => onQuitar(slot)}
          aria-label="Quitar del carrusel"
          className="h-6 px-1.5 rounded-lg text-[10px] transition-colors hover:bg-red-500/15"
          style={{ color: '#a8291f' }}
        ><CloseIcon className="w-3 h-3 mx-auto" /></button>
        <button type="button"
          onClick={() => onMover(slot, 1)}
          disabled={index === total - 1}
          aria-label="Mover a la derecha"
          className="flex-1 h-6 rounded-lg transition-colors hover:bg-[var(--hc-surface)] disabled:opacity-30"
          style={{ color: 'var(--hc-muted)' }}
        ><TrustGlyph tipo="adelante" className="w-3.5 h-3.5 mx-auto" /></button>
      </div>
    </>
  )
}

function CarruselSlotVacio() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1 py-4" style={{ color: 'var(--hc-muted)' }}>
      <span className="text-2xl opacity-30">+</span>
      <span className="text-[10px]">Vacío</span>
      <span className="text-[9px] opacity-60">Usá el botón de carrusel en la tabla</span>
    </div>
  )
}

function CarruselSlot({ index, slot, totalOcupados, onMover, onQuitar }) {
  const slotColor = SLOT_COLORES[index]
  const slotBorder = SLOT_BORDES[index]
  return (
    <div
      className="relative rounded-xl overflow-hidden flex flex-col"
      style={{ border: `1px solid ${slot ? slotBorder : 'var(--hc-border)'}`, background: slot ? slotColor : 'var(--hc-surface-2)', minHeight: 120 }}
    >
      <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: slot ? slotBorder : 'var(--hc-surface-2)', color: 'var(--hc-text)' }}>
        {index + 1}
      </div>
      {slot
        ? <CarruselSlotOcupado slot={slot} index={index} total={totalOcupados} onMover={onMover} onQuitar={onQuitar} />
        : <CarruselSlotVacio />}
    </div>
  )
}

export default function CarruselPanel({ carruselSlots, open, onToggleOpen, onMover, onQuitar }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <button type="button"
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--hc-surface-2)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(23,71,168,0.1)', border: '1px solid rgba(23,71,168,0.25)' }}>
            <svg className="w-4 h-4" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.636-6.364-2.122 2.122M8.758 15.242l-2.122 2.122m0-12.728 2.122 2.122m6.364 6.364 2.122 2.122"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Carrusel del inicio</p>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{carruselSlots.length}/5 productos · se muestran en el hero de la tienda</p>
          </div>
        </div>
        <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--hc-border)' }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Array.from({ length: CARRUSEL_SLOTS }, (_, i) => (
              <CarruselSlot
                key={i}
                index={i}
                slot={carruselSlots[i]}
                totalOcupados={carruselSlots.length}
                onMover={onMover}
                onQuitar={onQuitar}
              />
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: 'var(--hc-muted)' }}>
            Para agregar un producto al carrusel, presioná el botón de carrusel en la columna de la tabla. Máximo 5 productos.
          </p>
        </div>
      )}
    </div>
  )
}
