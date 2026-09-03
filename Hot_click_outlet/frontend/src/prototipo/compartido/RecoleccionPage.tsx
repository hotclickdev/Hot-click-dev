import RecoleccionPanel from '@/features/recoleccion/RecoleccionPanel'
import EntradaPagina from './motion/EntradaPagina'
import { EncabezadoPagina } from './ui'

type Props = Readonly<{ volverA: string }>

/**
 * Recolección y entrega para emprendedor, PYME y Negocio Plus.
 */
export default function RecoleccionPage({ volverA }: Props) {
  return (
    <main className="px-5 pb-10 pt-8 md:max-w-[760px] md:px-16 md:py-12">
      <EntradaPagina className="flex flex-col gap-8">
        <EncabezadoPagina
          titulo="Recolección y entrega"
          subtitulo="HOTCLICK pasa a buscar y entrega a tu cliente. Solo GAM por ahora."
          volverA={volverA}
        />
        <RecoleccionPanel />
      </EntradaPagina>
    </main>
  )
}
