import { useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'

/** Comparte el enlace de la tienda: hoja del sistema si existe, si no lo copia al portapapeles. */
export function useCompartirTienda(nombre: string) {
  const toast = useToast()

  return useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: nombre, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast({ message: 'Enlace de la tienda copiado', type: 'success' })
    } catch (err) {
      // El usuario cerró la hoja de compartir: no es un error.
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast({ message: 'No se pudo copiar el enlace', type: 'error' })
    }
  }, [nombre, toast])
}
