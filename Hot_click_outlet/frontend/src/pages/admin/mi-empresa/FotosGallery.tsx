import { useRef } from 'react'
import Section from './Section'
import { MAX_FOTOS } from './miEmpresaHelpers'

export default function FotosGallery({ fotos, canEdit, uploadingFoto, onFile, onEliminar }: {
  fotos: string[]
  canEdit: boolean
  uploadingFoto: boolean
  onFile: (file?: File) => void
  onEliminar: (i: number) => void
}) {
  const fotoInputRef = useRef<HTMLInputElement>(null)

  return (
    <Section title="Galería de fotos">
      <p className="text-xs mb-3" style={{ color: 'var(--hc-muted)' }}>
        Estas fotos se mostrarán en la galería de emprendedores de HotClick. Máximo 10 imágenes.
        Las fotos se guardan automáticamente al subirlas.
      </p>
      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => onFile(e.target.files?.[0])}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {fotos.map((url, i) => (
          <div key={i} className="relative group rounded-xl overflow-hidden aspect-square"
            style={{ border: '1px solid var(--hc-border)' }}>
            <img src={url} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
            {canEdit && (
              <button
                type="button"
                onClick={() => onEliminar(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: '#ef4444', color: '#fff' }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        ))}
        {canEdit && fotos.length < MAX_FOTOS && (
          <button
            type="button"
            onClick={() => fotoInputRef.current?.click()}
            disabled={uploadingFoto}
            className="rounded-xl aspect-square flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
            style={{ border: '2px dashed var(--hc-border)', backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
          >
            {uploadingFoto ? (
              <span className="text-xs">Subiendo…</span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span className="text-xs font-medium">Agregar</span>
              </>
            )}
          </button>
        )}
      </div>
    </Section>
  )
}
