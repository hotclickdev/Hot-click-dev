import { useCallback, useId, useRef, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorProducto } from './catalogoVendedorApi'
import { ACCEPT_FOTO_PRODUCTO, errorValidacionFoto, subirFotoProducto } from './subirFotoProducto'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [subiendo, setSubiendo] = useState(false)

  const abrirPicker = useCallback(() => {
    if (subiendo) return
    inputRef.current?.click()
  }, [subiendo])

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
    } catch (err: unknown) {
      toast({ message: mensajeErrorProducto(err, 'No se pudo subir la foto.'), type: 'error' })
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [onImagenChange, toast])

  const baseClass = bordeDiscontinuo
    ? 'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hc-border bg-[var(--hc-n-50)] py-8'
    : 'mb-6 flex min-h-[118px] flex-col items-center justify-center rounded-xl bg-hc-surface-2 px-4 py-6'

  return (
    <div className={`${baseClass} ${className}`.trim()}>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPT_FOTO_PRODUCTO}
        className="sr-only"
        disabled={subiendo}
        onChange={(e) => void subir(e.target.files?.[0])}
      />
      {imagenUrl ? (
        <>
          <img src={imagenUrl} alt="Vista previa del producto" className="h-20 w-20 rounded-xl object-cover" />
          <button
            type="button"
            onClick={abrirPicker}
            disabled={subiendo}
            className="mt-2 cursor-pointer rounded-full border border-hc-border px-3 py-1 text-xs font-medium text-hc-accent"
          >
            {subiendo ? 'Subiendo…' : 'Cambiar foto'}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={abrirPicker}
          disabled={subiendo}
          className="flex cursor-pointer flex-col items-center gap-2"
          aria-label="Agregar foto del producto"
        >
          <span className="relative mb-0 block size-[26px] overflow-clip">
            <img src={iconCamara} alt="" width={26} height={26} className="size-full" />
          </span>
          <p className="text-sm font-medium text-hc-muted">{subiendo ? 'Subiendo…' : 'Agregar foto'}</p>
          <p className="text-xs text-hc-muted">JPG, PNG o WebP, máx. 10 MB</p>
        </button>
      )}
    </div>
  )
}
