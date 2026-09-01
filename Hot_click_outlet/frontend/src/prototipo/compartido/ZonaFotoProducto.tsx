import { useCallback, useId, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { errorValidacionFoto, subirFotoProducto } from './subirFotoProducto'
import iconCamara from './assets/icon-camara.svg'

type Props = Readonly<{
  imagenUrl: string
  onImagenChange: (url: string) => void
  className?: string
  bordeDiscontinuo?: boolean
}>

/**
 * Zona para subir y previsualizar la foto de un producto (emprendedor / PYME).
 */
export default function ZonaFotoProducto({
  imagenUrl,
  onImagenChange,
  className = '',
  bordeDiscontinuo = false,
}: Props) {
  const inputId = useId()
  const toast = useToast()
  const [subiendo, setSubiendo] = useState(false)

  const subir = useCallback(async (file?: File) => {
    if (!file) return
    const error = errorValidacionFoto(file)
    if (error) {
      toast({ message: error, type: 'error' })
      return
    }
    setSubiendo(true)
    try {
      const url = await subirFotoProducto(file)
      if (url) onImagenChange(url)
      else toast({ message: 'No se recibió la URL de la foto.', type: 'error' })
    } catch {
      toast({ message: 'No se pudo subir la foto.', type: 'error' })
    } finally {
      setSubiendo(false)
    }
  }, [onImagenChange, toast])

  const baseClass = bordeDiscontinuo
    ? 'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hc-border bg-[var(--hc-n-50)] py-8'
    : 'mb-6 flex min-h-[118px] flex-col items-center justify-center rounded-xl bg-hc-surface-2 px-4 py-6'

  if (imagenUrl) {
    return (
      <div className={`${baseClass} ${className}`.trim()}>
        <img src={imagenUrl} alt="Vista previa del producto" className="h-20 w-20 rounded-xl object-cover" />
        <label
          htmlFor={inputId}
          className="mt-2 cursor-pointer rounded-full border border-hc-border px-3 py-1 text-xs font-medium text-hc-accent"
        >
          {subiendo ? 'Subiendo…' : 'Cambiar foto'}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          disabled={subiendo}
          onChange={(e) => void subir(e.target.files?.[0])}
        />
      </div>
    )
  }

  return (
    <label
      htmlFor={inputId}
      className={`${baseClass} cursor-pointer ${className}`.trim()}
    >
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        disabled={subiendo}
        onChange={(e) => void subir(e.target.files?.[0])}
      />
      <span className="relative mb-2 block size-[26px] overflow-clip">
        <img src={iconCamara} alt="" width={26} height={26} className="size-full" />
      </span>
      <p className="text-sm font-medium text-hc-muted">{subiendo ? 'Subiendo…' : 'Agregar foto'}</p>
      <p className="text-xs text-hc-muted">JPG o PNG, máx. 5 MB</p>
    </label>
  )
}
