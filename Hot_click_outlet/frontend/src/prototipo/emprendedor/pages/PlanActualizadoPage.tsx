import IconoExito from '../ui/IconoExito'
import EnlacePrimario from '../ui/EnlacePrimario'
import { EmprendedorCard } from '../ui/EmprendedorPageFrame'

/**
 * Plan actualizado (Figma 158:190 / 352:12244).
 */
export default function PlanActualizadoPage() {
  return (
    <main className="flex flex-col px-5 py-8 md:max-w-[760px] md:px-16 md:py-12">
      <EmprendedorCard className="flex flex-col items-center gap-4 text-center">
        <IconoExito />
        <h1 className="font-display text-lg font-bold md:text-[22px]">¡Listo! Tu plan fue actualizado</h1>
        <p className="text-[13px] text-hc-muted md:text-sm">
          Ya podés usar las funciones nuevas la próxima vez que inicies sesión.
        </p>
        <EnlacePrimario to="/opciones">Volver a Opciones</EnlacePrimario>
      </EmprendedorCard>
    </main>
  )
}
