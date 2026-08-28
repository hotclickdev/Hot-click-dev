/** Aviso de venta rápida sin cliente asociado. */
export default function TabVentaRapida() {
  return (
    <>
      <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Venta rápida</h2>
      <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-400/80">La venta se registrará como venta rápida sin asociar a un cliente. Útil para ventas en mostrador.</p>
      </div>
    </>
  )
}
