import TrustGlyph from '@/components/ui/TrustGlyph'

function tooltipSeo(product, hasTitle, hasDesc, both, none) {
  if (both) return `Título: ${product.metaTitle}\nDescripción: ${product.metaDescription}`
  if (none) return 'Sin título ni descripción SEO'
  if (hasTitle) return `Título: ${product.metaTitle}\nFalta meta descripción`
  return `Falta título SEO\nDescripción: ${product.metaDescription}`
}

function iconoSeo(both, none) {
  if (both) {
    return (
      <span style={{ color: '#1E7F4F' }}>
        <TrustGlyph tipo="check" className="w-4 h-4" />
      </span>
    )
  }
  if (none) {
    return (
      <span style={{ color: '#a8291f' }}>
        <TrustGlyph tipo="error" className="w-4 h-4" />
      </span>
    )
  }
  return (
    <span style={{ color: '#8a5a00' }}>
      <TrustGlyph tipo="alerta" className="w-4 h-4" />
    </span>
  )
}

export default function SeoStatusIcon({ product }) {
  const hasTitle = !!(product.metaTitle)
  const hasDesc = !!(product.metaDescription)
  const both = hasTitle && hasDesc
  const none = !hasTitle && !hasDesc
  return (
    <span title={tooltipSeo(product, hasTitle, hasDesc, both, none)} className="text-base cursor-default select-none inline-flex">
      {iconoSeo(both, none)}
    </span>
  )
}
