import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import FacturaHotclickPanel from './FacturaHotclickPanel'

type Pestana = 'cobro' | 'factura'

/** "Mi dinero": métodos de cobro y la factura que el negocio le emite a HotClick cada quincena. */
export default function PestanasDinero({ cobro }: { cobro: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const actual: Pestana = params.get('tab') === 'factura' ? 'factura' : 'cobro'
  const elegir = (p: Pestana) => setParams(p === 'factura' ? { tab: 'factura' } : {}, { replace: true })
  const clase = (p: Pestana) => `h-11 px-4 text-sm font-semibold transition-colors ${
    actual === p ? 'border-b-2 border-hc-primary text-hc-n-900' : 'text-hc-n-600 hover:text-hc-n-900'}`
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Mi dinero" className="flex gap-1 border-b border-hc-n-200">
        <button type="button" role="tab" aria-selected={actual === 'cobro'} className={clase('cobro')} onClick={() => elegir('cobro')}>
          Métodos de cobro
        </button>
        <button type="button" role="tab" aria-selected={actual === 'factura'} className={clase('factura')} onClick={() => elegir('factura')}>
          Factura a HotClick
        </button>
      </div>
      <div role="tabpanel">{actual === 'factura' ? <FacturaHotclickPanel /> : cobro}</div>
    </div>
  )
}
