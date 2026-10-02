import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import iconoCamion from '@/assets/figma/comprador/seguimiento-camion.svg'
import iconoCaja from '@/assets/figma/comprador/seguimiento-caja.svg'
import iconoExterno from '@/assets/figma/comprador/seguimiento-externo.svg'
import type { SeguimientoPaquete } from '@/services/seguimientoPedidoService'
import { CLASES_TONO, claveEstado, lineaGuia, tonoDeEstado } from './seguimientoHelpers'

const ICONOS = { camion: iconoCamion, caja: iconoCaja } as const

type Props = { paquete: SeguimientoPaquete; numero: number }

/** Tarjeta de un paquete (Figma 44:1715 · «Paquete 1 · Casa Luna 506»). */
export default function PaqueteSeguimientoCard({ paquete, numero }: Props) {
  const { t, i18n } = useTranslation()
  const linea = lineaGuia(paquete, i18n.language || 'es')
  const productos = paquete.productos ?? []

  return (
    <li className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-px">
          <h2 className="text-[14px] font-semibold text-hc-n-900">
            {t('comprador.seguimiento.paquete', { numero, tienda: paquete.tienda ?? 'HotClick' })}
          </h2>
          {paquete.origen && (
            <p className="text-[12px] text-hc-n-600">{t('comprador.seguimiento.saleDe', { origen: paquete.origen })}</p>
          )}
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-semibold ${CLASES_TONO[tonoDeEstado(paquete.estado)]}`}>
          {t(claveEstado(paquete.estado))}
        </span>
      </div>

      {productos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {productos.map((producto, i) => (
            <li key={`${producto.nombre ?? ''}-${i}`} className="size-12 shrink-0 overflow-hidden rounded-[8px] bg-hc-n-100">
              {producto.imagenUrl && (
                <img
                  src={producto.imagenUrl}
                  alt={producto.nombre ?? ''}
                  title={producto.cantidad && producto.cantidad > 1 ? `${producto.nombre ?? ''} ×${producto.cantidad}` : producto.nombre ?? undefined}
                  loading="lazy"
                  className="size-full object-cover"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-[6px] text-hc-n-600">
        <IconoFigma src={ICONOS[linea.icono]} size={16} />
        <p className="min-w-0 flex-1 text-[12px] [overflow-wrap:anywhere]">{t(linea.clave, linea.valores)}</p>
        {linea.urlRastreo && (
          <a
            href={linea.urlRastreo}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('comprador.seguimiento.rastrear', { numero })}
            className="-m-2 flex shrink-0 items-center justify-center p-2 text-hc-blue-600 hover:opacity-80"
          >
            <IconoFigma src={iconoExterno} size={16} />
          </a>
        )}
      </div>
    </li>
  )
}
