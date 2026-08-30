import { useRef, useState, type DragEvent } from 'react'
import Field from './Field'

export default function LogoUpload({ logoUrl, canEdit, uploading, onFile, onQuitar }: {
  logoUrl?: string
  canEdit: boolean
  uploading: boolean
  onFile: (file?: File) => void
  onQuitar: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <Field label="Logo del negocio">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => onFile(e.target.files?.[0])}
      />
      {logoUrl ? (
        <div className="flex items-center gap-4">
          <img
            src={logoUrl}
            alt="Logo"
            className="w-20 h-20 rounded-xl object-cover shrink-0"
            style={{ border: '1px solid var(--hc-border)' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Logo actual</p>
            {canEdit && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
                >
                  {uploading ? 'Subiendo…' : 'Cambiar logo'}
                </button>
                <button
                  type="button"
                  onClick={onQuitar}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: '#ef4444', backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
                >
                  Quitar
                </button>
              </div>
            )}
          </div>
        </div>
      ) : canEdit ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="w-full rounded-xl p-6 text-center transition-colors"
          style={{
            border: `2px dashed ${dragOver ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
            backgroundColor: dragOver ? 'var(--hc-accent)/5' : 'var(--hc-surface-2)',
          }}
        >
          {uploading ? (
            <p className="text-sm font-medium" style={{ color: 'var(--hc-accent)' }}>Subiendo imagen…</p>
          ) : (
            <>
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--hc-muted)' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Subir logo</p>
              <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>
                Arrastrá o hacé clic · PNG, JPG, SVG · máx. 10 MB
              </p>
            </>
          )}
        </button>
      ) : (
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Sin logo configurado</p>
      )}
    </Field>
  )
}
