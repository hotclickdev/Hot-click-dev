export default function PhotoPanel({ previews, imagenes }) {
  const photos = previews.length > 0 ? previews : imagenes
  if (photos.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Fotos del producto</p>
        <div className="aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3" style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface-2)' }}>
          <svg className="w-10 h-10" style={{ color: 'var(--hc-border)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="text-xs text-center leading-relaxed" style={{ color: 'var(--hc-muted)', opacity: 0.7 }}>Las fotos<br/>aparecerán aquí</span>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
        {photos.length} foto{photos.length !== 1 ? 's' : ''}
      </p>
      <div className="aspect-square rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
        <img src={photos[0]} alt="Principal" className="w-full h-full object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-1.5">
          {photos.slice(1, 9).map((src, idx) => (
            <div key={idx} className="aspect-square rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
              <img src={src} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px]" style={{ color: 'var(--hc-muted)', opacity: 0.8 }}>Primera foto = imagen principal</p>
    </div>
  )
}
