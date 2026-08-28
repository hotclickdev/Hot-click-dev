import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import MultiUploadZone from './MultiUploadZone'
import AnalisisProgress from './AnalisisProgress'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function PasoFotos({
  tieneBorrador, onCargarBorrador, onLimpiarBorrador,
  analizando, analizandoIdx, imagenesFile, previewUrls,
  onAddFiles, onRemoveFile, onAnalizar, onSkip,
}: {
  tieneBorrador: boolean
  onCargarBorrador: () => void
  onLimpiarBorrador: () => void
  analizando: boolean
  analizandoIdx: number
  imagenesFile: File[]
  previewUrls: string[]
  onAddFiles: (files: File[], silentlyDropped?: number) => void
  onRemoveFile: (idx: number) => void
  onAnalizar: () => void
  onSkip: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {tieneBorrador && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.25)' }}>
          <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span style={{ color: 'var(--hc-accent)' }} className="flex-1 text-xs">Tenés un borrador guardado.</span>
          <button type="button" onClick={onCargarBorrador} className="text-xs font-semibold px-3 py-1 rounded-lg"
            style={{ background: 'var(--hc-accent)', color: '#fff' }}>Cargar</button>
          <button type="button" onClick={onLimpiarBorrador} className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--hc-muted)' }}>Descartar</button>
        </div>
      )}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#8a5a00' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ color: '#8a5a00' }} className="text-xs">
          <strong>Subí fotos</strong> y la IA detectará nombre, precio, categoría y descripción automáticamente.
        </span>
      </div>
      {!analizando ? (
        <>
          <MultiUploadZone files={imagenesFile} previews={previewUrls} onAddFiles={onAddFiles} onRemove={onRemoveFile} />
          <div className="flex flex-col gap-3 pt-1">
            {imagenesFile.length > 0 && (
              <Button onClick={onAnalizar}>
                {t('admin.nuevoProducto.analyze')}
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold">{imagenesFile.length}</span>
              </Button>
            )}
            <button type="button" onClick={onSkip}
              className="w-full py-3 rounded-xl text-sm transition-colors hover:bg-[var(--hc-surface-2)]"
              style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
              {imagenesFile.length > 0 ? <TextoFlecha>Continuar sin analizar</TextoFlecha> : <TextoFlecha>Ingresar sin fotos</TextoFlecha>}
            </button>
          </div>
          <p className="text-xs text-center" style={{ color: 'var(--hc-muted)', opacity: 0.8 }}>
            ¿Tenés muchos productos?{' '}
            <a href="/admin/productos" className="underline transition-colors" style={{ color: 'var(--hc-accent)' }}>
              Importalos desde CSV
            </a>
          </p>
        </>
      ) : (
        <AnalisisProgress previews={previewUrls} currentIdx={analizandoIdx} />
      )}
    </div>
  )
}
