import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { posService } from '@/services/posService'
import { formatPrice } from '@/utils/format'
import { sinpeNumeroVisible } from './posPagoFormat'
import type { QrPagoInfo } from './posPagoTypes'
import PosPagoReporteModal from './PosPagoReporteModal'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'

type Props = Readonly<{
  info: QrPagoInfo
  token?: string
  onPagado: () => void
}>

/**
 * SINPE Móvil del QR de caja (Figma `29:1830`), sin pasarela: el cliente envía el monto al número
 * del negocio y el cajero confirma el pago; esta pantalla consulta el estado y cambia sola.
 */
export default function PosPagoSinpe({ info, token, onPagado }: Props) {
  const { t } = useTranslation()
  const [reporteAbierto, setReporteAbierto] = useState(false)

  useEffect(() => {
    if (!token) return
    const id = window.setInterval(async () => {
      try {
        const res = await posService.estadoQrSesion(token) as { estado?: string }
        if (res?.estado === 'PAGADO') onPagado()
      } catch {
        /* siguiente tick */
      }
    }, 2500)
    return () => window.clearInterval(id)
  }, [token, onPagado])

  return (
    <section className="flex flex-col gap-3 px-4 pb-3 pt-[18px]">
      <h1 className="font-display text-[20px] font-bold leading-[25px] tracking-normal text-hc-n-900">
        {t('pos.pago.sinpeTitulo')}
      </h1>

      <ol className="flex flex-col gap-[14px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
        <Paso numero={1}>
          <p className="text-[14px] leading-[16px] text-hc-n-600">
            {t('pos.pago.sinpePaso1', { monto: formatPrice(info.total ?? 0) })}
          </p>
          <ValorCopiable valor={sinpeNumeroVisible(info.sinpeNumero ?? '')} />
          <p className="text-[12px] leading-[14px] text-hc-n-600">{t('pos.pago.sinpePaso1Nota')}</p>
        </Paso>
        <Paso numero={2}>
          <p className="text-[14px] leading-[16px] text-hc-n-600">{t('pos.pago.sinpeMostrarCajero')}</p>
        </Paso>
      </ol>

      <output className="flex flex-col gap-1 rounded-[16px] bg-hc-warning-bg p-4">
        <span className="flex items-center gap-2 text-[14px] font-semibold leading-4 text-hc-warning">
          <img src={ICONOS_QR.esperando} alt="" className="size-4" />
          {t('pos.pago.esperandoTitulo')}
        </span>
        <span className="text-[12px] leading-[17px] text-hc-n-600">{t('pos.pago.esperandoDesc')}</span>
      </output>

      <button
        type="button"
        onClick={() => setReporteAbierto(true)}
        className="min-h-11 w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-3 text-[14px] font-semibold text-hc-n-900"
      >
        {t('pos.pago.reportarError')}
      </button>
      <PosPagoReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        token={token}
        codigoError="sinpe"
      />
    </section>
  )
}

function Paso({ numero, children }: Readonly<{ numero: number; children: React.ReactNode }>) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="grid size-[26px] shrink-0 place-items-center rounded-full bg-hc-blue-600 text-[12px] font-bold text-white"
      >
        {numero}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
    </li>
  )
}

function ValorCopiable({ valor }: Readonly<{ valor: string }>) {
  const { t } = useTranslation()
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sin permiso de portapapeles: el valor sigue visible para copiarlo a mano */
    }
  }

  return (
    <div className="flex items-center gap-[10px]">
      <span className="font-display text-[20px] font-bold leading-[25px] text-hc-n-900">{valor}</span>
      <button
        type="button"
        onClick={() => void copiar()}
        className="flex items-center gap-1 rounded-[8px] bg-hc-blue-50 px-2 py-1 text-[12px] font-semibold leading-[14px] text-hc-blue-600"
      >
        <img src={ICONOS_QR.copiar} alt="" className="size-[13px]" />
        {copiado ? t('pos.pago.copiado') : t('pos.pago.copiar')}
      </button>
    </div>
  )
}
