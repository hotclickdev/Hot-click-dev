import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

type ConsentimientoDatosProps = {
  acepta: boolean
  onCambiar: (acepta: boolean) => void
  className?: string
}

/** Consentimiento de la Ley 8968: sin él no se puede pagar. */
export default function ConsentimientoDatos({ acepta, onCambiar, className = '' }: ConsentimientoDatosProps) {
  const { t } = useTranslation()
  return (
    <label
      className={`flex cursor-pointer items-start gap-[10px] rounded-[10px] border p-[12px] ${acepta ? 'border-hc-blue-600 bg-hc-blue-50' : 'border-hc-n-200 bg-hc-n-0'} ${className}`}
    >
      <input
        type="checkbox"
        checked={acepta}
        onChange={(evento) => onCambiar(evento.target.checked)}
        className="mt-[2px] size-[15px] shrink-0 accent-hc-blue-600"
      />
      <span className="text-[11.5px] leading-[1.6] text-hc-n-600">
        {t('compra.pago.consentimiento')}{' '}
        <Link to="/privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">
          {t('compra.pago.privacidad')}
        </Link>
        {t('compra.pago.consentimientoCookies')}{' '}
        <Link to="/cookies" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">
          {t('compra.pago.cookies')}
        </Link>{' '}
        {t('compra.pago.consentimientoY')}{' '}
        <Link to="/devoluciones" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">
          {t('compra.pago.devoluciones')}
        </Link>.
      </span>
    </label>
  )
}
