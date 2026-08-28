import TrustGlyph from '@/components/ui/TrustGlyph'

export default function EnvioOpinionOk({
  titulo, detalle, onOtro, otroLabel,
}: {
  titulo: string
  detalle: string
  onOtro: () => void
  otroLabel: string
}) {
  return (
    <div className="px-5 py-8 text-center space-y-2">
      <span className="inline-flex justify-center" style={{ color: '#059669' }}>
        <TrustGlyph tipo="check" className="w-8 h-8" />
      </span>
      <p className="text-sm font-semibold" style={{ color: '#059669' }}>{titulo}</p>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{detalle}</p>
      <button type="button" className="text-xs mt-2 underline" style={{ color: 'var(--hc-muted)' }} onClick={onOtro}>
        {otroLabel}
      </button>
    </div>
  )
}
