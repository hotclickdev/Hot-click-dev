import { useRef, useState, useCallback } from 'react'
import { MAX_FOTOS } from './productFormUi'

export default function MultiUploadZone({ files, previews, onAddFiles, onRemove }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback((fileList) => {
    const remaining = MAX_FOTOS - files.length
    if (remaining <= 0) return
    const all = Array.from(fileList)
    const valid = all.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024).slice(0, remaining)
    const dropped = all.length - valid.length
    if (valid.length > 0 || dropped > 0) onAddFiles(valid, dropped)
  }, [files.length, onAddFiles])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  return (
    <div className="space-y-3">
      {previews.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {previews.map((src, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
              <img src={src} alt={`foto ${idx + 1}`} className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute bottom-0 inset-x-0 text-center text-[9px] text-white py-0.5" style={{ backgroundColor: 'rgba(23,71,168,0.85)' }}>Principal</span>
              )}
              <button type="button" onClick={() => onRemove(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none">
                ✕
              </button>
            </div>
          ))}
          {files.length < MAX_FOTOS && (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all hover:bg-[var(--hc-surface-2)]"
              style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px]">Agregar</span>
            </button>
          )}
        </div>
      )}

      {previews.length === 0 && (
        <button type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="w-full border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200"
          style={dragging
            ? { borderColor: 'var(--hc-accent)', backgroundColor: 'rgba(23,71,168,0.05)' }
            : { borderColor: 'var(--hc-border)' }}>
          <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--hc-accent)', opacity: 0.6 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-base font-semibold" style={{ color: 'var(--hc-text)' }}>Arrastrá las fotos del producto aquí</p>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>o hacé clic para seleccionar · hasta {MAX_FOTOS} fotos</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)', opacity: 0.7 }}>JPG, PNG, WebP — máx 5 MB c/u</p>
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />

      {previews.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{files.length}/{MAX_FOTOS} fotos · la primera será la imagen principal</p>
      )}
    </div>
  )
}
