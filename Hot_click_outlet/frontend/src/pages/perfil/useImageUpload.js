import { useState } from 'react'
import { testimonioService } from '@/services/testimonioService'

/**
 * Subida de foto opcional para testimonio o reseña.
 * @param {(opts: { message: string, type: string }) => void} toast
 */
export default function useImageUpload(toast) {
  const [imagenUrl, setImagenUrl] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await testimonioService.subirImagen(fd)
      const url = data?.url ?? null
      if (!url) throw new Error('No se recibió URL de la imagen')
      setImagenUrl(url)
    } catch (err) {
      const msg = err.response?.data?.message ?? err.message
      toast({ message: typeof msg === 'string' ? msg : 'Error al subir la imagen.', type: 'error' })
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const reset = () => { setImagenUrl(null); setPreview(null) }

  return { imagenUrl, preview, uploading, handleFile, reset }
}
