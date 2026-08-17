import { useState, useRef, useCallback } from 'react'
import { createDraft, IMAGE_MAX_BYTES } from './cargaMasivaHelpers'
import { IconUpload, IconX, IconPlus, IconArrow } from './cargaMasivaIcons'

export default function StepSubida({ onContinuar, limit }) {
  const [drafts, setDrafts] = useState([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const addFiles = useCallback((fileList) => {
    const remaining = limit - drafts.length
    if (remaining <= 0) return
    const valid = Array.from(fileList)
      .filter(f => f.type.startsWith('image/') && f.size <= IMAGE_MAX_BYTES)
      .slice(0, remaining)
    if (!valid.length) return
    setDrafts(prev => [...prev, ...valid.map(createDraft)])
  }, [drafts.length, limit])

  const remove = (id) => {
    setDrafts(prev => {
      const d = prev.find(x => x.id === id)
      if (d) URL.revokeObjectURL(d.mainPreview)
      return prev.filter(x => x.id !== id)
    })
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const openFilePicker = () => inputRef.current?.click()
  const onZoneKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openFilePicker()
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div
        role="button"
        tabIndex={0}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={openFilePicker}
        onKeyDown={onZoneKeyDown}
        className="rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center py-16 gap-4"
        style={{
          borderColor: dragging ? 'var(--hc-accent)' : 'rgba(255,255,255,0.12)',
          background: dragging ? 'rgba(79,124,255,0.06)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(79,124,255,0.12)', border: '1px solid rgba(79,124,255,0.3)' }}>
          <IconUpload className="w-7 h-7" style={{ color: 'var(--hc-accent)' }} />
        </div>
        <div className="text-center pointer-events-none">
          <p className="font-semibold text-base" style={{ color: 'var(--hc-text)' }}>
            {drafts.length === 0 ? 'Arrastrá las fotos aquí o hacé clic' : `${drafts.length} foto${drafts.length === 1 ? '' : 's'} cargada${drafts.length === 1 ? '' : 's'}`}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            1 foto = 1 producto · máx. {limit} imágenes · hasta 10 MB por foto
          </p>
        </div>
      </div>

      {drafts.length > 0 && (
        <>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {drafts.map((d) => (
              <div key={d.id} className="relative aspect-square rounded-xl overflow-hidden group"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <img src={d.mainPreview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); remove(d.id) }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.75)' }}
                >
                  <IconX className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {drafts.length < limit && (
              <button
                type="button"
                onClick={openFilePicker}
                className="aspect-square rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
                style={{ border: '1px dashed rgba(255,255,255,0.15)' }}
              >
                <IconPlus className="w-5 h-5 pointer-events-none" style={{ color: 'var(--hc-muted)' }} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
              {drafts.length} de {limit} imágenes
            </p>
            <button
              onClick={() => onContinuar(drafts)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-85"
              style={{ background: 'var(--hc-accent)', color: '#fff' }}
            >
              Continuar con {drafts.length} producto{drafts.length === 1 ? '' : 's'}
              <IconArrow className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
