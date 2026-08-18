import { chipsAsesorProducto } from '../productAdvisorChips'

/** @param {object | null} product */
export function preguntasRapidasDe(product) {
  return chipsAsesorProducto(product)
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 4, height: 4, borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.55)',
          animation: 'hc-dot 1.1s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </span>
  )
}
