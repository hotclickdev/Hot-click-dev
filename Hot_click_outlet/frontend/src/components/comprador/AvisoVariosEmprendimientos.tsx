import { useTranslation } from 'react-i18next'
import IconoFigma from './IconoFigma'
import { ICONOS_COMPRADOR } from './iconosComprador'

type AvisoVariosEmprendimientosProps = {
  cantidadNegocios: number
  className?: string
}

/** Figma `40:1350`: solo aparece con productos de 2 o más emprendimientos. */
export const MIN_NEGOCIOS_AVISO = 2

export default function AvisoVariosEmprendimientos({ cantidadNegocios, className = '' }: AvisoVariosEmprendimientosProps) {
  const { t } = useTranslation()
  if (cantidadNegocios < MIN_NEGOCIOS_AVISO) return null

  const puntos = [
    { icono: ICONOS_COMPRADOR.avisoEnvio, color: 'text-hc-blue-600', titulo: t('comprador.aviso.envioTitulo'), texto: t('comprador.aviso.envioTexto') },
    { icono: ICONOS_COMPRADOR.avisoUbicacion, color: 'text-hc-blue-600', titulo: t('comprador.aviso.domicilioTitulo'), texto: t('comprador.aviso.domicilioTexto') },
    {
      icono: ICONOS_COMPRADOR.avisoCorazon,
      color: 'text-hc-red-500',
      titulo: t('comprador.aviso.apoyoTitulo', { count: cantidadNegocios }),
      texto: t('comprador.aviso.apoyoTexto'),
    },
  ]

  return (
    <section className={`flex flex-col gap-[10px] rounded-[14px] border border-hc-blue-100 bg-hc-blue-50 p-[14px] ${className}`}>
      <h2 className="flex items-center gap-2 font-display text-[14px] font-bold leading-[18px] text-hc-blue-600">
        <IconoFigma src={ICONOS_COMPRADOR.avisoTienda} size={18} />
        {t('comprador.aviso.titulo', { count: cantidadNegocios })}
      </h2>
      {puntos.map((punto) => (
        <div key={punto.titulo} className="flex items-start gap-[10px]">
          <IconoFigma src={punto.icono} size={16} className={punto.color} />
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <p className="text-[13px] font-semibold leading-[17px] text-hc-n-900">{punto.titulo}</p>
            <p className="text-[12px] leading-[16px] text-hc-n-600">{punto.texto}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
