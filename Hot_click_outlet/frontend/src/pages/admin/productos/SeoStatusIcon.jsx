function CheckIcon() {
  return (
    <svg className="w-4 h-4" style={{ color: '#1E7F4F' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg className="w-4 h-4" style={{ color: '#a8291f' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg className="w-4 h-4" style={{ color: '#8a5a00' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function tooltipSeo(product, hasTitle, hasDesc, both, none) {
  if (both) return `Título: ${product.metaTitle}\nDescripción: ${product.metaDescription}`
  if (none) return 'Sin título ni descripción SEO'
  if (hasTitle) return `Título: ${product.metaTitle}\nFalta meta descripción`
  return `Falta título SEO\nDescripción: ${product.metaDescription}`
}

export default function SeoStatusIcon({ product }) {
  const hasTitle = !!(product.metaTitle)
  const hasDesc = !!(product.metaDescription)
  const both = hasTitle && hasDesc
  const none = !hasTitle && !hasDesc
  const tip = tooltipSeo(product, hasTitle, hasDesc, both, none)
  let icon = <WarningIcon />
  if (both) icon = <CheckIcon />
  else if (none) icon = <CrossIcon />
  return (
    <span title={tip} className="text-base cursor-default select-none inline-flex">
      {icon}
    </span>
  )
}
