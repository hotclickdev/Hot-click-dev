import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Aviso, BOTON_PRIMARIO } from './piezas'
import { RUTA_ONBOARDING_RAPIDO } from './tiendaRapida'

/**
 * Enlace usado (409), vencido o anulado (410) o inexistente (404): el aviso y una única CTA
 * «Iniciar sesión» (QA-122-6). Si ya se usó, al entrar vuelve al onboarding.
 */
export default function EnlaceNoVigente({ motivo }: Readonly<{ motivo: 'usado' | 'vencido' | 'noVigente' }>) {
  const { t } = useTranslation()
  const destino = motivo === 'usado' ? `/login?redirect=${encodeURIComponent(RUTA_ONBOARDING_RAPIDO)}` : '/login'
  return (
    <>
      <Aviso>{t(`negocioRapido.enlace.${motivo}`)}</Aviso>
      <Link to={destino} className={BOTON_PRIMARIO}>{t('footer.iniciarSesion')}</Link>
    </>
  )
}
