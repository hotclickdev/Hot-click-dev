import { useCallback, useId, useRef, useState, type DragEvent } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorProducto } from './catalogoVendedorApi'
import { ACCEPT_FOTO_PRODUCTO, errorValidacionFoto, subirFotoProducto } from './subirFotoProducto'
import { clasesZonaFotoDrag } from './zonaFotoProductoDrag'
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
  const profundidadDrag = useRef(0)
  const toast = useToast()
  const reducedMotion = useReducedMotion() ?? false
  const [subiendo, setSubiendo] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)

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

  const resetDrag = () => {
    profundidadDrag.current = 0
    setArrastrando(false)
  }

  const alEntrarDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (subiendo) return
    profundidadDrag.current += 1
    setArrastrando(true)
  }

  const alSobreDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (subiendo) return
    e.dataTransfer.dropEffect = 'copy'
  }

  const alSalirDrag = () => {
    profundidadDrag.current = Math.max(0, profundidadDrag.current - 1)
    if (profundidadDrag.current === 0) setArrastrando(false)
  }

  const alSoltar = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    resetDrag()
    if (subiendo) return
    void subir(e.dataTransfer.files?.[0])
  }

  const layout = bordeDiscontinuo
    ? 'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-8'
    : 'mb-6 flex min-h-[118px] flex-col items-center justify-center rounded-xl px-4 py-6'

  const dragClass = clasesZonaFotoDrag({ arrastrando, reducedMotion, bordeDiscontinuo })

  return (
    <div
      className={`${layout} ${dragClass} ${className}`.trim()}
      onDragEnter={alEntrarDrag}
      onDragOver={alSobreDrag}
      onDragLeave={alSalirDrag}
      onDrop={alSoltar}
    >
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
