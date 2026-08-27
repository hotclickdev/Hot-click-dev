import { useNavigate } from 'react-router-dom'
import BadgeEstado from '../ui/BadgeEstado'
import BotonSecundario from '../ui/BotonSecundario'
import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'

const METODOS = [
  { id: 'sinpe', letra: 'S', nombre: 'SINPE Móvil', detalle: '8888-0000', predeterminado: true },
  { id: 'iban', letra: 'C', nombre: 'Cuenta IBAN', detalle: 'CR21 0000 **** 4521', predeterminado: false },
  { id: 'visa', letra: 'T', nombre: 'Tarjeta de crédito', detalle: 'Visa •••• 4412', predeterminado: false },
] as const

/**
 * Métodos de cobro (Figma 64:194).
 */
export default function CobroPage() {
  const navigate = useNavigate()
  return (
    <main className="flex flex-col gap-[18px] px-5 pb-10 pt-8">
      <CabeceraAtras titulo="Métodos de Cobro" to={`${RUTA_EMPRENDEDOR}/opciones`} />
      {METODOS.map((metodo) => (
        <div key={metodo.id} className="flex items-center gap-3 rounded-[14px] border border-hc-border p-3.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--hc-n-100)] text-sm font-bold text-hc-muted">
            {metodo.letra}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">{metodo.nombre}</p>
            <p className="text-[11px] text-hc-muted">{metodo.detalle}</p>
          </div>
          {metodo.predeterminado ? <BadgeEstado tono="exito">Predeterminado</BadgeEstado> : null}
        </div>
      ))}
      <BotonSecundario onClick={() => navigate(`${RUTA_EMPRENDEDOR}/proximamente`)}>
        + Agregar método
      </BotonSecundario>
    </main>
  )
}
