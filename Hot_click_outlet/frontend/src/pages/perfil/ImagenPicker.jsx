import { useRef } from 'react'
import Spinner from '@/components/ui/Spinner'
import TrustGlyph from '@/components/ui/TrustGlyph'
import CloseIcon from '@/components/ui/CloseIcon'

export default function ImagenPicker({ preview, uploading, onRemove, onFile }) {
  const ref = useRef(null)
  return (
    <div>
      <label htmlFor="profile-foto" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
        Foto <span style={{ color: 'var(--hc-muted)', fontWeight: 400 }}>(opcional)</span>
      </label>
      {preview ? (
        <div className="relative w-20 h-20">
          <img src={preview} alt="preview" className="w-20 h-20 rounded-xl object-cover" />
          {uploading
            ? <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/50"><Spinner size="sm" /></div>
            : <button type="button" onClick={onRemove}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}
                aria-label="Quitar foto">
                <CloseIcon className="w-3 h-3" />
              </button>
          }
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          style={{ border: '1px dashed var(--hc-border)', color: 'var(--hc-muted)' }}>
          <TrustGlyph tipo="camara" className="w-4 h-4" />
          Agregar foto
        </button>
      )}
      <input id="profile-foto" ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  )
}
