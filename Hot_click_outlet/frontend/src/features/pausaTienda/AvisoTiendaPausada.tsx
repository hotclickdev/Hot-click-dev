import { AVISO_TIENDA_PAUSADA } from './tiendaPausada'

/** Aviso neutro para el comprador, sin el motivo. */
export default function AvisoTiendaPausada() {
  return (
    <p role="status" className="flex items-start gap-2 rounded-[12px] border border-hc-blue-600/20 bg-hc-blue-50 px-3.5 py-3 text-[13px] text-hc-n-900">
      <span aria-hidden="true" className="mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-hc-blue-600 text-[10px] font-bold text-hc-blue-600">i</span>
      {AVISO_TIENDA_PAUSADA}
    </p>
  )
}
