import { detectarColor } from '@/utils/colorDetector'

/**
 * Swatches de color del producto actual y de variantes hermanas.
 */
export default function ColorSwatches({ product, variantes, onNavigate, t }) {
  if (!(product.colorVariante || variantes.some((v) => v.colorVariante))) return null
  const hexActual = (product.colorVariante && detectarColor(product.colorVariante).hex) || '#3a3a42'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-[#8e8e9a]">{t('product.otherColors', 'Otros colores')}:</span>
      <button type="button" onClick={() => {}} disabled
        className="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-offset-[#0d0d12] ring-[#e8e8ed] shrink-0"
        style={{ backgroundColor: hexActual }}
        title={product.colorVariante || product.nombre} />
      {variantes.filter((v) => v.colorVariante).map((v) => {
        const hex = (v.colorVariante && detectarColor(v.colorVariante).hex) || '#3a3a42'
        return (
          <button key={v.id} type="button" onClick={() => onNavigate(`/productos/${v.id}`)}
            className="w-7 h-7 rounded-full border border-white/20 shrink-0 hover:scale-110 transition-transform"
            style={{ backgroundColor: hex }}
            title={v.colorVariante || v.nombreProducto} />
        )
      })}
    </div>
  )
}
