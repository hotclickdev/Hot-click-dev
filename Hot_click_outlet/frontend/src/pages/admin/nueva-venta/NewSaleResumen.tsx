import Button from '@/components/ui/Button'
import { formatPrice } from '@/utils/format'
import { BoltIcon, WhatsAppIcon } from './nuevaVentaIcons'
import useTenantStore from '@/store/tenantStore'
import type { TFunction } from 'i18next'
import type { TabVentaId } from './nuevaVentaHelpers'

/** Misma fórmula que AggregatorCommissionMath.calcular (backend): % HALF_UP sobre el bruto, con piso ₡ para EMPRENDEDOR. */
function estimarComision(bruto: number, pct: number, minimoCrc: number): number {
  if (bruto <= 0 || pct <= 0) return 0
  const total = Math.round((bruto * pct) / 100)
  return minimoCrc > 0 ? Math.max(total, minimoCrc) : total
}

/**
 * Envío, totales y botones de acción de nueva venta.
 */
export default function NewSaleResumen({
  t, tab, costoEnvio, envioNum, subtotal, total, saving, itemsLength,
  onCostoEnvio, onSaveCliente, onSaveRapida, onCotizar,
}: {
  t: TFunction
  tab: TabVentaId
  costoEnvio: string
  envioNum: number
  subtotal: number
  total: number
  saving: boolean
  itemsLength: number
  onCostoEnvio: (v: string) => void
  onSaveCliente: () => void
  onSaveRapida: () => void
  onCotizar: () => void
}) {
  const comisionPorcentaje = useTenantStore((s) => s.comisionPorcentaje)
  const comisionMinimaCrc = useTenantStore((s) => s.comisionMinimaCrc)
  const comision = estimarComision(total, comisionPorcentaje, comisionMinimaCrc)
  const neto = Math.max(0, total - comision)

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Costo de envío <span className="normal-case font-normal">(opcional)</span></label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8e8e9a] pointer-events-none">₡</span>
          <input
            type="number"
            min="0"
            value={costoEnvio}
            onChange={(e) => onCostoEnvio(e.target.value)}
            placeholder="0"
            className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-white/8 space-y-1">
        {envioNum > 0 && (
          <>
            <div className="flex justify-between items-center text-sm text-[#8e8e9a]">
              <span>Subtotal productos</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-[#8e8e9a]">
              <span>Costo de envío</span>
              <span>{formatPrice(envioNum)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center font-bold text-[#e8e8ed]">
          <span className="text-sm">{t('admin.sales.total')}</span>
          <span className="text-xl">{formatPrice(total)}</span>
        </div>
        {comisionPorcentaje > 0 && total > 0 && (
          <>
            <div className="flex justify-between items-center text-sm text-[#8e8e9a]">
              <span>Comisión HotClick ({comisionPorcentaje}%)</span>
              <span>-{formatPrice(comision)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-[#8e8e9a]">
              <span>Recibís aprox.</span>
              <span>{formatPrice(neto)}</span>
            </div>
          </>
        )}
      </div>

      {tab === 'cliente' && (
        <Button
          type="button"
          loading={saving}
          size="lg"
          className="w-full"
          disabled={itemsLength === 0}
          onClick={onSaveCliente}
        >
          {t('admin.sales.submit')}
        </Button>
      )}
      {tab === 'rapida' && (
        <Button
          type="button"
          loading={saving}
          size="lg"
          className="w-full bg-amber-500 hover:bg-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          disabled={itemsLength === 0}
          onClick={onSaveRapida}
        >
          <BoltIcon />
          {t('admin.sales.submit')}
        </Button>
      )}
      {tab === 'cotizar' && (
        <Button
          type="button"
          size="lg"
          className="w-full bg-[#25D366] hover:bg-[#1da851] shadow-[0_0_20px_rgba(37,211,102,0.25)]"
          disabled={itemsLength === 0}
          onClick={onCotizar}
        >
          <WhatsAppIcon />
          Enviar Cotización por WhatsApp
        </Button>
      )}
    </>
  )
}
