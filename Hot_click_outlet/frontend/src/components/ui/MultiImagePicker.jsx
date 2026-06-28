import { useState, useRef } from 'react'
import { productService } from '@/services/productService'
import { useTranslation } from 'react-i18next'

const MAX_FOTOS = 10

async function uploadImagen(file) {
  const fd = new FormData()
  fd.append('file', file)
  const r = await productService.uploadImage(fd)
  const url = r.data?.data?.url ?? r.data?.url ?? r.data
  if (!url || typeof url !== 'string') throw new Error('No se obtuvo URL de la imagen')
  return url
}

export default function MultiImagePicker({ imagenes = [], onChange }) {
  const { t } = useTranslation()
  const [uploadingCount, setUploadingCount] = useState(0)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const processFiles = async (fileList) => {
    const remaining = MAX_FOTOS - imagenes.length
    if (remaining <= 0) { setError(t('multiImagePicker.maxPhotos', { max: MAX_FOTOS })); return }
    const toUpload = Array.from(fileList).filter((f) => f.type.startsWith('image/')).slice(0, remaining)
    if (toUpload.length === 0) { setError(t('multiImagePicker.onlyImages')); return }
    setError('')
    setUploadingCount(toUpload.length)
    const results = await Promise.allSettled(
      toUpload.map((f) => {
        if (f.size > 5 * 1024 * 1024) return Promise.reject(new Error(`${f.name}: máx 5 MB`))
        return uploadImagen(f)
      })
    )
    const newUrls = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
    const failed  = results.filter((r) => r.status === 'rejected').map((r) => r.reason.message)
    if (failed.length > 0) setError(failed[0])
    if (newUrls.length > 0) onChange([...imagenes, ...newUrls])
    setUploadingCount(0)
  }

  const remove = (idx) => onChange(imagenes.filter((_, i) => i !== idx))

  const onDrop = (e) => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files) }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#e8e8ed]">
        {t('multiImagePicker.label')}
        <span className="ml-2 text-xs text-[#8e8e9a]">{imagenes.length}/{MAX_FOTOS}</span>
      </label>

      {(imagenes.length > 0 || uploadingCount > 0) && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {imagenes.map((url, idx) => (
            <div key={url + idx} className="relative group aspect-square rounded-xl overflow-hidden bg-[#1a1a1f] border border-white/8">
              <img src={url} alt={`foto ${idx + 1}`} className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute bottom-0 inset-x-0 text-center text-[9px] bg-[#4f7cff]/80 text-white py-0.5">{t('multiImagePicker.principal')}</span>
              )}
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none"
              >✕</button>
            </div>
          ))}
          {Array.from({ length: uploadingCount }).map((_, i) => (
            <div key={`up-${i}`} className="aspect-square rounded-xl bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center">
              <span className="w-4 h-4 border-2 border-[#4f7cff]/30 border-t-[#4f7cff] rounded-full animate-spin" />
            </div>
          ))}
        </div>
      )}

      {imagenes.length < MAX_FOTOS && (
        <button
          type="button"
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => uploadingCount === 0 && inputRef.current?.click()}
          className={`w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all min-h-[90px] ${
            dragging ? 'border-[#4f7cff] bg-[#4f7cff]/10' : 'border-white/15 bg-white/3 hover:border-[#4f7cff]/50 hover:bg-white/5'
          }`}
        >
          {uploadingCount > 0 ? (
            <>
              <span className="w-5 h-5 border-2 border-[#4f7cff]/30 border-t-[#4f7cff] rounded-full animate-spin" />
              <span className="text-xs text-[#8e8e9a]">{t('multiImagePicker.uploading', { count: uploadingCount })}</span>
            </>
          ) : (
            <>
              <svg className="w-7 h-7 text-[#8e8e9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p className="text-sm text-[#8e8e9a]">
                {imagenes.length === 0 ? t('multiImagePicker.dropZone') : `${t('multiImagePicker.addMore')} — `}
                {' '}<span className="text-[#4f7cff]">{t('multiImagePicker.browse')}</span>
              </p>
              <p className="text-xs text-[#8e8e9a]/60">{t('multiImagePicker.dropzoneHint', { max: MAX_FOTOS })}</p>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { processFiles(e.target.files); e.target.value = '' }} />
        </button>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      {imagenes.length > 1 && (
        <p className="text-xs text-[#8e8e9a]">{t('multiImagePicker.firstIsMain')}</p>
      )}
    </div>
  )
}
