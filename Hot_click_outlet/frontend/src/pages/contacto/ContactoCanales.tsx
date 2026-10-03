import { useTranslation } from 'react-i18next'
import { IcoSrv } from '../servicios/IcoSrv'
import { WHATSAPP } from './contactoHelpers'

const FILA = 'flex items-center gap-3 px-4 py-3'
const SEPARADOR = 'border-t border-hc-n-200'

/** Flecha de fila enlazada (chevron 16 px `hc-n-500`, como las filas de 28:1660). */
function Flecha() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 text-hc-n-500">
      <path d="m6 3.5 4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Bandera de Costa Rica (franjas 1-1-2-1-1). */
function BanderaCostaRica() {
  return (
    <svg viewBox="0 0 30 18" className="h-[13px] w-[22px] shrink-0 overflow-hidden rounded-[3px]" aria-hidden="true">
      <rect width="30" height="3" y="0" fill="#002b7f" />
      <rect width="30" height="3" y="3" fill="#fff" />
      <rect width="30" height="6" y="6" fill="#ce1126" />
      <rect width="30" height="3" y="12" fill="#fff" />
      <rect width="30" height="3" y="15" fill="#002b7f" />
    </svg>
  )
}

function Texto({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-px leading-[normal]">
      <span className="truncate text-[14px] font-medium text-hc-n-900">{titulo}</span>
      <span className="text-[12px] leading-[17px] text-hc-n-600">{detalle}</span>
    </span>
  )
}

/** Canales de contacto en una tarjeta de filas (derivado de Figma `28:1660`, filas de tarifas). */
export function ContactoCanales() {
  const { t } = useTranslation()
  return (
    <ul className="m-0 flex list-none flex-col rounded-[16px] border border-hc-n-200 bg-hc-n-0 py-1">
      <li>
        <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t('contacto.waDefault'))}`} target="_blank" rel="noopener noreferrer" className={FILA}>
          <IcoSrv nombre="cotizacionWhatsapp" size={20} />
          <Texto titulo="WhatsApp · +506 8666-7888" detalle={t('contacto.waHint')} />
          <Flecha />
        </a>
      </li>
      <li className={SEPARADOR}>
        <a href="mailto:hotclick.cr@gmail.com" className={FILA}>
          <IcoSrv nombre="enviarChat" size={20} />
          <Texto titulo="hotclick.cr@gmail.com" detalle={t('contacto.email')} />
          <Flecha />
        </a>
      </li>
      <li className={`${SEPARADOR} ${FILA}`}>
        <span className="flex size-5 shrink-0 items-center justify-center"><BanderaCostaRica /></span>
        <Texto titulo="Costa Rica" detalle={t('contacto.country')} />
      </li>
    </ul>
  )
}

/** Horario en filas con punto de estado verde (abierto) o gris (cerrado). */
export function ContactoHorario() {
  const { t } = useTranslation()
  const filas = [
    { dia: t('contacto.weekdays'), horas: t('contacto.weekdaysHours'), abierto: true },
    { dia: t('contacto.weekend'), horas: t('contacto.closed'), abierto: false },
  ]
  return (
    <ul className="m-0 flex list-none flex-col rounded-[16px] border border-hc-n-200 bg-hc-n-0 px-4 py-1">
      {filas.map((f, i) => (
        <li key={f.dia} className={`flex items-center gap-3 py-3 leading-[normal] ${i === 0 ? '' : SEPARADOR}`}>
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${f.abierto ? 'bg-hc-success' : 'bg-hc-n-300'}`} />
          <span className={`flex-1 text-[14px] ${f.abierto ? 'font-medium text-hc-n-900' : 'text-hc-n-600'}`}>{f.dia}</span>
          <span className={`text-[14px] tabular-nums ${f.abierto ? 'font-semibold text-hc-n-900' : 'text-hc-n-600'}`}>{f.horas}</span>
        </li>
      ))}
    </ul>
  )
}
