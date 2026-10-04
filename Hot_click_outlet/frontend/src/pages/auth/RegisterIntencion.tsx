import { Link } from 'react-router-dom'
import type { TFunction } from 'i18next'
import { IcoCamion, IcoCaja } from '../perfil/cuenta/iconosCuenta'
import MarcaComprador from '@/components/comprador/header/MarcaComprador'
import { RUTA_REGISTRO_EMPRESA } from '@/utils/destinoVender'

type RegisterIntencionProps = {
  t: TFunction
  onComprar: () => void
}

/**
 * Primera pantalla de /registro: comprar o vender, para no mandar a nadie a un flujo sin salida.
 */
export default function RegisterIntencion({ t, onComprar }: RegisterIntencionProps) {
  return (
    <div className="flex flex-1 flex-col leading-[normal]">
      <div className="flex flex-col gap-[10px] px-4 pb-2 pt-7">
        <div className="flex h-9 items-center"><MarcaComprador tamano="escritorio" /></div>
        <h1 className="font-display text-[24px] font-bold leading-[30px] text-hc-n-900">{t('register.intencionTitulo')}</h1>
        <p className="text-[14px] leading-5 text-hc-n-600">{t('register.intencionTexto')}</p>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-2 pt-[18px]">
        <button
          type="button"
          onClick={onComprar}
          className="flex items-center gap-3 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[14px] text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-hc-blue-50 text-hc-blue-600">
            <IcoCamion size={18} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-hc-n-900">{t('register.quieroComprar')}</span>
            <span className="text-[13px] leading-[18px] text-hc-n-600">{t('register.comprarDetalle')}</span>
          </span>
        </button>

        <Link
          to={RUTA_REGISTRO_EMPRESA}
          className="flex items-center gap-3 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[14px] text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-hc-blue-50 text-hc-blue-600">
            <IcoCaja size={18} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-hc-n-900">{t('register.quieroVender')}</span>
            <span className="text-[13px] leading-[18px] text-hc-n-600">{t('register.venderDetalle')}</span>
          </span>
        </Link>
      </div>

      <p className="px-4 pt-6 text-[13px] text-hc-n-600">
        {t('register.alreadyAccount')}{' '}
        <Link to="/login" className="font-semibold text-hc-blue-600 hover:underline">{t('register.login')}</Link>
      </p>

      <div className="mt-auto px-4 pb-[28px] pt-8">
        <Link to="/" className="block text-center text-[14px] font-semibold text-hc-blue-600 hover:underline">{t('login.invitado')}</Link>
      </div>
    </div>
  )
}
