import { useState, useRef, useCallback, type DragEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { createDraft, IMAGE_MAX_BYTES, type ProductoDraft } from './cargaMasivaHelpers'
import { IconUpload, IconX, IconPlus } from './cargaMasivaIcons'

export default function StepSubida({ onContinuar, limit, importarCsvTo = '/admin/productos/importar' }: {
  onContinuar: (drafts: ProductoDraft[]) => void
  limit: number
  importarCsvTo?: string
}) {
  const [drafts, setDrafts] = useState<ProductoDraft[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return
    const remaining = limit - drafts.length
    if (remaining <= 0) return
    const valid = Array.from(fileList)
      .filter(f => f.type.startsWith('image/') && f.size <= IMAGE_MAX_BYTES)
      .slice(0, remaining)
    if (!valid.length) return
    setDrafts(prev => [...prev, ...valid.map(createDraft)])
  }, [drafts.length, limit])

  const remove = (id: string) => {
    setDrafts(prev => {
      const d = prev.find(x => x.id === id)
      if (d) URL.revokeObjectURL(d.mainPreview)
      return prev.filter(x => x.id !== id)
    })
  }

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const openFilePicker = () => inputRef.current?.click()
  const onZoneKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openFilePicker()
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        tabIndex={0}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={openFilePicker}
        onKeyDown={onZoneKeyDown}
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-[30px] transition-all"
        style={{
          borderColor: dragging ? 'var(--hc-primary)' : 'var(--hc-border)',
          background: dragging ? 'var(--hc-red-50)' : 'var(--hc-surface-2)',
        }}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--hc-red-50)]">
          <IconUpload className="h-7 w-7 text-hc-primary" />
        </div>
        <div className="pointer-events-none text-center">
          <p className="text-[13px] font-medium text-hc-text">
            {drafts.length === 0 ? 'Arrastrá las fotos aquí o hacé clic' : textoFotosCargadas(drafts.length)}
          </p>
          <p className="mt-1 text-[11px] text-hc-muted">
            1 foto = 1 producto · máx. {limit} imágenes · hasta 10 MB por foto
          </p>
        </div>
      </button>

      <Link to={importarCsvTo} className="block text-xs font-bold text-hc-primary">
        Importar catálogo CSV
      </Link>

      {drafts.length > 0 && (
        <>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {drafts.map((d) => (
              <div key={d.id} className="group relative aspect-square overflow-hidden rounded-xl border border-hc-border">
                <img src={d.mainPreview} alt="" className="size-full object-cover" />
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); remove(d.id) }}
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-hc-text/80 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <IconX className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
            {drafts.length < limit && (
              <button
                type="button"
                onClick={openFilePicker}
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-hc-border"
              >
                <IconPlus className="h-5 w-5 pointer-events-none text-hc-muted" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => onContinuar(drafts)}
            className="w-full rounded-[14px] bg-hc-primary py-4 text-[15px] font-bold text-white"
          >
            Continuar
          </button>
        </>
      )}
    </div>
  )
}

function textoFotosCargadas(n: number) {
  const s = n === 1 ? '' : 's'
  return `${n} foto${s} cargada${s}`
}
