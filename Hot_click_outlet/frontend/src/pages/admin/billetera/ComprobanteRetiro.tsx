import { fmt, type WalletPayout } from './billeteraHelpers'

/** Comprobante imprimible de un retiro pagado. Muestra solo datos del registro real. */
export default function ComprobanteRetiro({ payout, onClose }: { payout: WalletPayout; onClose: () => void }) {
  const destino = payout.metodo === 'SINPE' ? payout.destinoSinpe : payout.destinoIban
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="comprobante-titulo">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-hc-n-900 print:shadow-none">
        <h2 id="comprobante-titulo" className="text-lg font-semibold">Comprobante de liquidación</h2>
        <p className="text-xs text-hc-n-700">HotClick · Retiro #{String(payout.id)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-hc-n-700">Fecha de solicitud</dt>
          <dd>{new Date(payout.fechaSolicitud).toLocaleDateString('es-CR')}</dd>
          <dt className="text-hc-n-700">Monto</dt>
          <dd className="font-mono font-semibold">₡{fmt(payout.monto)}</dd>
          <dt className="text-hc-n-700">Método</dt>
          <dd>{payout.metodo}</dd>
          <dt className="text-hc-n-700">Destino</dt>
          <dd>{destino ?? '-'}</dd>
          <dt className="text-hc-n-700">Estado</dt>
          <dd>{payout.estado}</dd>
          {payout.notasAdmin && (<><dt className="text-hc-n-700">Referencia</dt><dd>{payout.notasAdmin}</dd></>)}
        </dl>
        <div className="mt-6 flex justify-end gap-2 print:hidden">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm">Cerrar</button>
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-hc-red-600 px-4 py-2 text-sm font-medium text-white">Imprimir o guardar PDF</button>
        </div>
      </div>
    </div>
  )
}