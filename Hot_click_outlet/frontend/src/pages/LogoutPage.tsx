import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { cerrarSesionPorUrl } from './logoutPorUrl'

/** /logout por URL: cierra la sesión igual que el botón de /perfil y redirige al inicio. */
export default function LogoutPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const hecho = useRef(false)
  useEffect(() => {
    if (hecho.current) return
    hecho.current = true
    void cerrarSesionPorUrl({
      token: useAuthStore.getState().token,
      cerrarLocal: () => useAuthStore.getState().logout(),
      avisar: () => toast({ message: t('profile.loggedOut'), type: 'info' }),
      navegar: (destino) => navigate(destino, { replace: true }),
    })
  }, [navigate, t, toast])
  return null
}
