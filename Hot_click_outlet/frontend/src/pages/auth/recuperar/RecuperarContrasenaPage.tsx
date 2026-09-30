import { useTranslation } from 'react-i18next'
import Seo from '@/components/seo/Seo'
import PasoCodigo from './PasoCodigo'
import PasoCorreo from './PasoCorreo'
import PasoNueva from './PasoNueva'
import { BarraRecuperar, PasosRecuperar } from './recuperarUi'
import { useRecuperarContrasena } from './useRecuperarContrasena'

/**
 * /recuperar-contrasena — Figma "05 · Cuenta": 44:1551 (correo), 44:1580 (código), 44:1614 (nueva).
 * Pantalla propia con barra de "volver", sin el header del marketplace, como en el mockup.
 */
export default function RecuperarContrasenaPage() {
  const { t } = useTranslation()
  const flujo = useRecuperarContrasena()
  return (
    <div className="flex min-h-screen w-full flex-col bg-hc-n-0">
      <Seo title={`${t('forgot.title')} | HotClick`} description={t('forgot.emailText')} noindex />
      <BarraRecuperar onVolver={flujo.volver} />
      <main className="mx-auto flex w-full max-w-md flex-col items-start gap-[18px] px-5 pb-2 pt-6">
        <PasosRecuperar actual={flujo.paso} />
        {flujo.paso === 'correo' && <PasoCorreo flujo={flujo} />}
        {flujo.paso === 'codigo' && <PasoCodigo flujo={flujo} />}
        {flujo.paso === 'nueva' && <PasoNueva flujo={flujo} />}
      </main>
    </div>
  )
}
