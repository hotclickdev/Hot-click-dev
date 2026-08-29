import EmprendedorPageFrame, { EmprendedorCard, EmprendedorFilaLista } from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'

const METODOS = [
  { id: 'sinpe', nombre: 'SINPE Móvil', detalle: '8888-0000 · Predeterminado' },
  { id: 'iban', nombre: 'Cuenta IBAN', detalle: 'CR21 0000 **** 4521' },
  { id: 'visa', nombre: 'Tarjeta de crédito', detalle: 'Visa •••• 4412' },
] as const

/**
 * Métodos de cobro (Figma 64:194 / 352:4732).
 */
export default function CobroPage() {
  return (
    <EmprendedorPageFrame titulo="Métodos de Cobro" volverA={`${RUTA_EMPRENDEDOR}/opciones`}>
      <EmprendedorCard className="flex flex-col gap-4">
        {METODOS.map((metodo) => (
          <EmprendedorFilaLista key={metodo.id} titulo={metodo.nombre} detalle={metodo.detalle} />
        ))}
      </EmprendedorCard>
    </EmprendedorPageFrame>
  )
}
