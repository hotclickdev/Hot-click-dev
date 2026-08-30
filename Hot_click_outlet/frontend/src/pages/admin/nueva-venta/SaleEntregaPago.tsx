import { ETAPAS_ENVIO, ETAPAS_RETIRO, METODOS_PAGO } from './nuevaVentaHelpers'
import TrustGlyph from '@/components/ui/TrustGlyph'

export default function SaleEntregaPago({
  paymentMethod,
  tipoEntrega,
  estadoInicial,
  onPaymentMethod,
  onTipoEntrega,
  onEstadoInicial,
}: {
  paymentMethod: string
  tipoEntrega: string
  estadoInicial: string
  onPaymentMethod: (v: string) => void
  onTipoEntrega: (v: string) => void
  onEstadoInicial: (v: string) => void
}) {
  const etapas = tipoEntrega === 'LOCAL' ? ETAPAS_RETIRO : ETAPAS_ENVIO
  const enFinanzas = estadoInicial === 'ENTREGADO' || estadoInicial === 'COMPLETADO'
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#e8e8ed]">Método de pago</label>
        <select
          value={paymentMethod}
          onChange={(e) => onPaymentMethod(e.target.value)}
          className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
        >
          {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#e8e8ed]">Tipo de entrega</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'LOCAL', label: 'Retiro en local', icono: 'edificio' },
            { value: 'DOMICILIO', label: 'Envío a domicilio', icono: 'envio' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onTipoEntrega(opt.value); onEstadoInicial('COMPLETADO') }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                tipoEntrega === opt.value
                  ? 'bg-[#4f7cff]/15 border-[#4f7cff]/50 text-[#7fa3ff]'
                  : 'bg-white/3 border-white/8 text-[#8e8e9a] hover:border-white/15 hover:text-[#e8e8ed]'
              }`}
            >
              <TrustGlyph tipo={opt.icono} className="w-4 h-4" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#e8e8ed]">
          Etapa actual
          {enFinanzas
            ? <span className="ml-2 text-xs text-emerald-400 font-normal">aparece en finanzas</span>
            : <span className="ml-2 text-xs text-amber-400 font-normal">no aparece en finanzas aún</span>
          }
        </label>
        <div className="flex flex-wrap gap-1.5">
          {etapas.map((e) => (
            <button
              key={e.key}
              type="button"
              onClick={() => onEstadoInicial(e.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                estadoInicial === e.key
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-white/3 border-white/8 text-[#8e8e9a] hover:border-white/20 hover:text-[#e8e8ed]'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
