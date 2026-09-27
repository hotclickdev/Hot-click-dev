import EncabezadoCompraSegura from '@/pages/checkout/EncabezadoCompraSegura'
import { mensajeCargaPago } from './pagoHelpers'

type PagoLoadingProps = {
  estado: string
  stripeApproved: boolean
}

/** Espera mientras se verifica o captura el pago, con la estética de las pantallas de resultado. */
export default function PagoLoading({ estado, stripeApproved }: PagoLoadingProps) {
  return (
    <div className="min-h-screen bg-hc-n-50">
      <EncabezadoCompraSegura />
      <main className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-[10px] px-[16px] pt-[48px] text-center">
        <span className="flex size-[72px] items-center justify-center rounded-full bg-hc-blue-50" role="status">
          <span className="size-[34px] animate-spin rounded-full border-[3px] border-hc-blue-100 border-t-hc-blue-600" />
        </span>
        <h1 className="font-display text-[19px] font-bold text-hc-n-900">{mensajeCargaPago(estado, stripeApproved)}</h1>
        <p className="text-[14px] leading-[20px] text-hc-n-600">Esto puede tardar unos segundos…</p>
      </main>
    </div>
  )
}
