import { useCallback, useId, useRef, useState, type DragEvent } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorProducto } from './catalogoVendedorApi'
import { comprimirFotoProducto } from './comprimirFotoProducto'
import { ACCEPT_FOTO_PRODUCTO, errorValidacionFoto, subirFotoProducto } from './subirFotoProducto'
import { clasesZonaFotoDrag } from './zonaFotoProductoDrag'

type Props = Readonly<{
  imagenUrl: string
  onImagenChange: (url: string) => void
  className?: string
  bordeDiscontinuo?: boolean
}>

/**
 * Foto del producto: cámara, galería (varias) y miniaturas en 4 columnas.
 */
export default function ZonaFotoProducto({
  imagenUrl,
  onImagenChange,
  className = '',
  bordeDiscontinuo = false,
}: Props) {
  const camaraId = useId()
  const galeriaId = useId()
  const camaraRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)
  const profundidadDrag = useRef(0)
  const toast = useToast()
  const reducedMotion = useReducedMotion() ?? false
  const [subiendo, setSubiendo] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [extras, setExtras] = useState<string[]>([])
  const urls = [imagenUrl, ...extras].filter(Boolean)

  const subirVarias = useCallback(async (files: FileList | File[] | null) => {
    const lista = files ? [...files] : []
    if (lista.length === 0 || subiendo) return
    setSubiendo(true)
    try {
      const nuevas: string[] = []
      for (const file of lista) {
        const error = errorValidacionFoto(file)
        if (error) {
          toast({ message: error, type: 'error' })
          continue
        }
        const comprimida = await comprimirFotoProducto(file)
        const url = await subirFotoProducto(comprimida)
        if (url) nuevas.push(url)
      }
      if (nuevas.length === 0) return
      if (!imagenUrl) {
        onImagenChange(nuevas[0])
        setExtras((prev) => [...prev, ...nuevas.slice(1)])
      } else {
        setExtras((prev) => [...prev, ...nuevas])
      }
    } catch (err: unknown) {
      toast({ message: mensajeErrorProducto(err, 'No se pudo subir la foto.'), type: 'error' })
    } finally {
      setSubiendo(false)
      if (camaraRef.current) camaraRef.current.value = ''
      if (galeriaRef.current) galeriaRef.current.value = ''
    }
  }, [imagenUrl, onImagenChange, subiendo, toast])

  const resetDrag = () => {
    profundidadDrag.current = 0
    setArrastrando(false)
  }

  const alSoltar = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    resetDrag()
    void subirVarias(e.dataTransfer.files)
  }

  function quitar(url: string) {
    if (url === imagenUrl) {
      const [primera, ...resto] = extras
      onImagenChange(primera ?? '')
      setExtras(resto)
      return
    }
    setExtras((prev) => prev.filter((u) => u !== url))
  }

  const dragClass = clasesZonaFotoDrag({ arrastrando, reducedMotion, bordeDiscontinuo })

  return (
    <div
      className={`flex flex-col gap-3 ${dragClass} ${className}`.trim()}
      onDragEnter={(e) => {
        e.preventDefault()
        if (subiendo) return
        profundidadDrag.current += 1
        setArrastrando(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!subiendo) e.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={() => {
        profundidadDrag.current = Math.max(0, profundidadDrag.current - 1)
        if (profundidadDrag.current === 0) setArrastrando(false)
      }}
      onDrop={alSoltar}
    >
      <input
        id={camaraId}
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={subiendo}
        onChange={(e) => void subirVarias(e.target.files)}
      />
      <input
        id={galeriaId}
        ref={galeriaRef}
        type="file"
        accept={ACCEPT_FOTO_PRODUCTO}
        multiple
        className="sr-only"
        disabled={subiendo}
        onChange={(e) => void subirVarias(e.target.files)}
      />
      {urls.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {urls.map((url) => (
            <li key={url} className="relative">
              <img src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => quitar(url)}
                className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-hc-surface text-xs font-bold text-hc-text"
                aria-label="Quitar foto"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={subiendo}
          onClick={() => camaraRef.current?.click()}
          className="flex min-h-12 items-center justify-center rounded-[14px] border border-hc-border bg-hc-surface px-3 text-center text-[13px] font-semibold text-hc-text disabled:opacity-60"
        >
          {subiendo ? 'Subiendo…' : 'Tomar foto'}
        </button>
        <button
          type="button"
          disabled={subiendo}
          onClick={() => galeriaRef.current?.click()}
          className="flex min-h-12 items-center justify-center rounded-[14px] border border-hc-border bg-hc-surface px-3 text-center text-[13px] font-medium text-hc-text"
        >
          Elegir de la galería
        </button>
      </div>
    </div>
  )
}
