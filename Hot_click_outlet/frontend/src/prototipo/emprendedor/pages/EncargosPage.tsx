import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'
import EncargosPanel from '@/features/encargos/EncargosPanel'

/**
 * Encargos personalizados — panel emprendedor (misma lógica que admin).
 */
export default function EncargosPage() {
  return (
    <main className="flex flex-col gap-4 px-5 py-8">
      <CabeceraAtras titulo="Encargos" to={RUTA_EMPRENDEDOR} />
      <EncargosPanel
        titulo="Encargos personalizados"
        subtitulo="Revisá fotos y notas del cliente, cotizá y enviá el link de pago."
      />
    </main>
  )
}
