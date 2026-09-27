import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { abandonedCartService } from '@/services/abandonedCartService'
import { useToast } from '@/components/ui/Toast'
import { isValidEmail } from '@/utils/validators'
import type { ItemCarrito } from '@/types/carrito'
import {
  EMAIL_GUARDADO_OCULTAR_MS,
  EMAIL_PROMPT_DELAY_MS,
  emailCarritoYaCapturado,
  guardarEmailCarritoLocal,
} from './cartHelpers'

/** Pide el correo a un visitante sin sesión para mandarle el carrito si lo abandona. */
export function useCorreoCarritoAbandonado(items: ItemCarrito[], token: string | null) {
  const toast = useToast()
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [correo, setCorreo] = useState('')
  const [guardado, setGuardado] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (token || emailCarritoYaCapturado() || items.length === 0) return
    temporizador.current = setTimeout(() => setVisible(true), EMAIL_PROMPT_DELAY_MS)
    return () => clearTimeout(temporizador.current ?? undefined)
  }, [token, items.length])

  async function guardar() {
    if (!isValidEmail(correo)) return
    try {
      await abandonedCartService.saveAbandonedCart(items, correo)
      guardarEmailCarritoLocal(correo)
      setGuardado(true)
      setTimeout(() => setVisible(false), EMAIL_GUARDADO_OCULTAR_MS)
    } catch {
      toast({ message: t('common.error'), type: 'error' })
    }
  }

  return { visible, correo, setCorreo, guardado, guardar, cerrar: () => setVisible(false) }
}
