import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatDate } from '@/utils/format'
import type { ActividadItem } from './actividadRecienteHelpers'
import { AccesoPedidos, AccesoSolicitudes, AccesoOpiniones } from '@/components/comprador/estados/iconosAcceso'

const ICONO: Record<ActividadItem['tipo'], ReactNode> = {
  pedido: <AccesoPedidos />,
  solicitud: <AccesoSolicitudes />,
  resena: <AccesoOpiniones />,
}

/** Feed de actividad reciente (Figma `28:1196`), armado con datos ya cargados. */
export default function ActividadReciente({ items }: { items: ActividadItem[] }) {
  const { t } = useTranslation()
  if (items.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-[16px] font-bold text-hc-n-900">
        {t('perfil.actividadReciente', 'Actividad reciente')}
      </h2>
      <ul className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
        {items.map((item, i) => (
          <li key={item.id} className={i > 0 ? 'border-t border-hc-n-200' : ''}>
            <Link to={item.to} className="flex items-center gap-3 px-4 py-3 hover:bg-hc-n-50">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-hc-blue-600">
                {ICONO[item.tipo]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-hc-n-900">{item.titulo}</span>
                <span className="block truncate text-[12px] text-hc-n-500">{item.detalle}</span>
              </span>
              {item.fecha && <span className="shrink-0 text-[11px] text-hc-n-500">{formatDate(item.fecha)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
