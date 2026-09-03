import EncargosPanel from '@/features/encargos/EncargosPanel'
import { EncabezadoPagina } from './ui'

type Props = Readonly<{ volverA: string }>

/**
 * Encargos personalizados — panel compartido PYME / Negocio Plus (misma lógica que admin y emprendedor).
 */
export default function EncargosPage({ volverA }: Props) {
  return (
    <main className="px-5 pb-10 pt-8 md:max-w-[760px] md:px-16 md:py-12" data-mm="seller-encargos">
      <EncabezadoPagina titulo="Encargos" volverA={volverA} />
      <EncargosPanel
        titulo="Encargos personalizados"
        subtitulo="Revisá fotos y notas del cliente, cotizá y enviá el link de pago."
      />
    </main>
  )
}
