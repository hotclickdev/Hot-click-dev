import { Link } from 'react-router-dom'
import { rutaEspacioEmpresa } from './empresasHelpers'
import {
  nombreEmpresaSinUbicacion,
  tituloAvisoSinUbicacion,
  type EmpresaSinUbicacion,
} from './empresasSinUbicacionHelpers'

type Props = Readonly<{ empresas: readonly EmpresaSinUbicacion[] }>

/** Aviso de admin (mismo estilo que los avisos de `AdminConfigFiscal`). */
export default function AvisoEmpresasSinUbicacion({ empresas }: Props) {
  if (empresas.length === 0) return null

  return (
    <div
      role="alert"
      data-mm="admin-aviso-sin-ubicacion"
      className="rounded-xl p-4 text-sm"
      style={{ border: '1px solid #F6E3AA', background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }}
    >
      <p className="font-semibold">{tituloAvisoSinUbicacion(empresas.length)}</p>
      <p className="mt-1 text-xs opacity-90">
        Sin provincia, cantón y dirección no se aprueban ni publican productos nuevos. Pediles que la carguen en Bodegas.
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {empresas.map((empresa) => (
          <li key={String(empresa.id)}>
            <Link to={rutaEspacioEmpresa(empresa.id)} className="font-medium underline">
              {nombreEmpresaSinUbicacion(empresa)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
