import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'

/** Comparte el enlace de la tienda: hoja del sistema si existe, si no lo copia al portapapeles. */
export function useCompartirTienda(nombre: string) {
  const toast = useToast()
  const { t } = useTranslation()

  return useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: nombre, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast({ message: t('tienda.enlaceCopiado'), type: 'success' })
    } catch (err) {
      // El usuario cerró la hoja de compartir: no es un error.
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast({ message: t('tienda.enlaceError'), type: 'error' })
    }
  }, [nombre, toast, t])
}
