import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { marcaService } from '@/services/marcaService'
import { urlLogoDesdeRespuesta, type FormularioMarca, type MarcaAdmin } from './formMarca'
import CloseIcon from '@/components/ui/CloseIcon'

function UploadIcon() {
  return (
    <svg className="w-8 h-8 text-[#8e8e9a]/50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function LogoPreview({ url, onQuitar }: { url: string; onQuitar: () => void }) {
  return (
    <div className="flex items-center justify-center">
      <div className="relative group">
        <div className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
          <img
            src={url}
            alt="Logo"
            className="w-full h-full object-contain p-2"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
        <button
          type="button"
          onClick={onQuitar}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          title="Quitar logo"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function LogoDropzone({ uploading, dragOver, fileInputRef, onDragOver, onDragLeave, onDrop, onElegirArchivo, onFileChange }: {
  uploading: boolean
  dragOver: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  onDragOver: (evento: DragEvent<HTMLButtonElement>) => void
  onDragLeave: () => void
  onDrop: (evento: DragEvent<HTMLButtonElement>) => void
  onElegirArchivo: () => void
  onFileChange: (evento: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <button
      type="button"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onElegirArchivo}
      className="relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed w-full transition-colors"
      style={{
        borderColor: dragOver ? 'var(--hc-accent)' : 'var(--hc-border-strong)',
        backgroundColor: dragOver ? 'rgba(23,71,168,0.08)' : 'var(--hc-surface-2)',
      }}
    >
      {uploading ? (
        <Spinner size="sm" />
      ) : (
        <>
          <UploadIcon />
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            <span className="font-medium" style={{ color: 'var(--hc-text)' }}>Hacé clic</span>{' '}o arrastrá una imagen
          </p>
          <p className="text-xs" style={{ color: 'var(--hc-muted)', opacity: 0.6 }}>PNG, JPG, SVG · máx. 5 MB</p>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
    </button>
  )
}

export type MarcaFormModalProps = {
  open: boolean
  onClose: () => void
  editing: MarcaAdmin | null
  form: FormularioMarca
  onNombreChange: (evento: ChangeEvent<HTMLInputElement>) => void
  onQuitarLogo: () => void
  onLogoSubido: (url: string) => void
  saving: boolean
  onSubmit: (evento: FormEvent) => void
}

export default function MarcaFormModal({
  open,
  onClose,
  editing,
  form,
  onNombreChange,
  onQuitarLogo,
  onLogoSubido,
  saving,
  onSubmit,
}: MarcaFormModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function subirLogo(archivo?: File) {
    if (!archivo) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', archivo)
      const respuesta = await marcaService.uploadLogo(formData)
      onLogoSubido(urlLogoDesdeRespuesta(respuesta))
    } catch {
      toast({ message: t('common.error'), type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(evento: DragEvent<HTMLButtonElement>) {
    evento.preventDefault()
    setDragOver(false)
    const archivo = evento.dataTransfer.files?.[0]
    if (archivo) subirLogo(archivo)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('admin.marcas.edit') : t('admin.marcas.new')}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <Input
          label="Nombre *"
          value={form.nombreMarca}
          onChange={onNombreChange}
          placeholder="Ej: Samsung, Apple, Nike..."
          required
        />

        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Logo</span>
          {form.logoUrl ? (
            <LogoPreview url={form.logoUrl} onQuitar={onQuitarLogo} />
          ) : (
            <LogoDropzone
              uploading={uploading}
              dragOver={dragOver}
              fileInputRef={fileInputRef}
              onDragOver={(evento) => { evento.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onElegirArchivo={() => fileInputRef.current?.click()}
              onFileChange={(evento) => subirLogo(evento.target.files?.[0])}
            />
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="submit" loading={saving} className="flex-1">
            {editing ? 'Guardar cambios' : 'Crear marca'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
