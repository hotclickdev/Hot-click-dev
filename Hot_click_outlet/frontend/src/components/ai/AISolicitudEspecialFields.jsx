import CloseIcon from '@/components/ui/CloseIcon'

export function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--hc-muted)' }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{error}</p>}
    </div>
  )
}

export function inputStyle(error) {
  return {
    background: 'var(--hc-surface-2, rgba(0,0,0,0.04))',
    border: `1px solid ${error ? '#f87171' : 'var(--hc-border)'}`,
    color: 'var(--hc-text)',
    caretColor: 'var(--hc-accent)',
  }
}

export function FotoReferencia({ imagenPreview, onClear, onImageChange }) {
  return (
    <div>
      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--hc-muted)' }}>Foto de referencia (opcional)</p>
      {imagenPreview
        ? (
          <div className="relative inline-flex">
            <img src={imagenPreview} alt="Referencia" className="w-20 h-20 rounded-xl object-cover" style={{ border: '1px solid var(--hc-border)' }} />
            <button
              type="button"
              onClick={onClear}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: 'var(--hc-accent)', color: '#fff' }}
              aria-label="Quitar foto"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          </div>
        )
        : (
          <label className="flex items-center gap-2 cursor-pointer w-fit px-4 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-70"
            style={{ background: 'var(--hc-surface-2, rgba(0,0,0,0.06))', border: '1px dashed var(--hc-border)', color: 'var(--hc-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Subir foto
            <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
          </label>
        )}
    </div>
  )
}
