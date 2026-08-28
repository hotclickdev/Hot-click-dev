/**
 * Sello de vendedor (Brand Book §15.4).
 * «Emprendedor verificado» — badge azul, solo cuando la verificación es real.
 * «Hecho en Costa Rica» — badge neutro, opt-in del vendedor.
 * Pills con punto/check + texto: el color nunca es el único indicador (cap. 9).
 */
export default function SellerBadge({
  verificado = false,
  hechoEnCR = false,
  className = '',
}: {
  verificado?: boolean
  hechoEnCR?: boolean
  className?: string
}) {
  if (!verificado && !hechoEnCR) return null
  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {verificado && (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ background: 'var(--hc-info-bg)', color: 'var(--hc-info)', border: '1px solid color-mix(in srgb, var(--hc-info) 24%, transparent)' }}
        >
          <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Emprendedor verificado
        </span>
      )}
      {hechoEnCR && (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
        >
          Hecho en Costa Rica
        </span>
      )}
    </span>
  )
}
