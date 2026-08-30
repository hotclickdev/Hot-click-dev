import { useState, type ChangeEvent } from 'react'
import { testimonioService } from '@/services/testimonioService'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorApi, textoCampoApi } from './perfilHelpers'

type ToastFn = ReturnType<typeof useToast>

export default function useImageUpload(toast: ToastFn) {
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await testimonioService.subirImagen(fd)
      const url = textoCampoApi(data, 'url') ?? null
      if (!url) throw new Error('No se recibió URL de la imagen')
      setImagenUrl(url)
    } catch (err: unknown) {
      const msg = mensajeErrorApi(err) ?? (err instanceof Error ? err.message : undefined)
      toast({ message: typeof msg === 'string' ? msg : 'Error al subir la imagen.', type: 'error' })
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const reset = () => { setImagenUrl(null); setPreview(null) }

  return { imagenUrl, preview, uploading, handleFile, reset }
}
