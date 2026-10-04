import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import HojaInferior from '@/components/comprador/HojaInferior'
import { itemsMas } from './panelNavegacionMovil'

type Props = Readonly<{
  abierta: boolean
  onCerrar: () => void
  base: string
  planApi: string
}>

/** Hoja de «Más»: filas de 52 px hacia Tienda, Reportes, Equipo, Bodegas, Planes y Opciones. */
export default function HojaMasPanel({ abierta, onCerrar, base, planApi }: Props) {
  return (
    <HojaInferior
      abierta={abierta}
      onCerrar={onCerrar}
      // TODO copy Producto
      titulo={<h2 className="font-display text-lg font-bold text-hc-text">Más</h2>}
    >
      <ul className="flex flex-col">
        {itemsMas(base, planApi).map((item) => (
          <li key={item.clave} className="border-b border-hc-n-200 last:border-b-0">
            <Link
              to={item.to}
              onClick={onCerrar}
              className="flex min-h-[52px] items-center justify-between gap-3 text-[15px] font-medium text-hc-text"
            >
              {item.etiqueta}
              <ChevronRightIcon className="size-5 text-hc-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </HojaInferior>
  )
}
