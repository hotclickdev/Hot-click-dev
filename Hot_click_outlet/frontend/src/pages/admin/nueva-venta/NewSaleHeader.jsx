import Button from '@/components/ui/Button'
import TextoFlecha from '@/components/ui/TextoFlecha'

/**
 * Título y volver de nueva venta.
 */
export default function NewSaleHeader({ t, onVolver }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">
          <span className="text-[#e8e8ed]">{t('admin.sales.title')}</span>
        </h1>
        <p className="text-sm text-[#8e8e9a] mt-1">Registra una venta, venta rápida o cotización por WhatsApp</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onVolver} className="shrink-0">
        <TextoFlecha dir="atras">Volver</TextoFlecha>
      </Button>
    </div>
  )
}
