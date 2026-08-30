import CloseIcon from '@/components/ui/CloseIcon'

export default function ComprobanteImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <button type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-hc-surface border border-hc-border text-hc-muted hover:text-hc-text flex items-center justify-center z-10 transition-colors"
          aria-label="Cerrar"
        >
          <CloseIcon />
        </button>
        <img
          src={src}
          alt="Comprobante SINPE ampliado"
          className="w-full rounded-2xl border border-hc-border max-h-[80vh] object-contain bg-black/40"
        />
      </div>
    </div>
  )
}
