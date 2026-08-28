import type { MesaSelfCheckout } from './selfCheckoutTypes'

/**
 * Cabecera con logo y mesa.
 */
export default function SelfCheckoutHeader({ mesa, primaryColor }: { mesa: MesaSelfCheckout | null; primaryColor: string }) {
  return (
    <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
      style={{ backgroundColor: '#0f0f17', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {mesa?.logoUrl ? (
        <img src={mesa.logoUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
      ) : (
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg"
          style={{ backgroundColor: primaryColor, color: '#fff' }}>
          {mesa?.empresaNombre?.[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{mesa?.empresaNombre}</p>
        <p className="text-xs text-gray-400 truncate">{mesa?.mesaNombre}</p>
      </div>
    </div>
  )
}
