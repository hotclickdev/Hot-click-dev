import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { rutaLoginConRetorno } from '@/utils/authRedirect'

/** Login que vuelve a «Mis pedidos» (`/login?redirect=%2Fmis-pedidos`); `/login` sanea el `redirect` (solo rutas internas). */
const RUTA_LOGIN_MIS_PEDIDOS = rutaLoginConRetorno('/mis-pedidos')

/**
 * S4-19 (contrato `docs/contratos/S4-19-correo-registrado.md`): en la confirmación de invitado se muestra siempre,
 * sin preguntar al backend si el correo tiene cuenta. Texto secundario de Figma `29:1932` con enlace b600.
 */
export default function IniciarSesionInvitado() {
  const { t } = useTranslation()
  return (
    <p className="text-center text-[13px] leading-[18px] text-hc-n-600">
      {t('payment.exito.yaTenesCuenta')}{' '}
      <Link to={RUTA_LOGIN_MIS_PEDIDOS} className="font-semibold text-hc-blue-600 underline-offset-2 hover:underline">
        {t('payment.exito.iniciarSesionMisPedidos')}
      </Link>
    </p>
  )
}
