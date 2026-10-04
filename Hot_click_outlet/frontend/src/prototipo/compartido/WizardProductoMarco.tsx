import { useState, type ReactNode } from 'react'
import CabeceraWizardProducto from './CabeceraWizardProducto'
import HojaSalirWizard from './HojaSalirWizard'

type Props = Readonly<{
  titulo: string
  paso?: number
  total?: number
  sucio: boolean
  onSalir: () => void
  desktop: ReactNode
  children: ReactNode
}>

/** Marco mobile del wizard: cabecera ✕ + confirmación si hay datos. */
export default function WizardProductoMarco({
  titulo,
  paso,
  total,
  sucio,
  onSalir,
  desktop,
  children,
}: Props) {
  const [confirma, setConfirma] = useState(false)

  function pedirCerrar() {
    if (sucio) setConfirma(true)
    else onSalir()
  }

  return (
    <main className="flex flex-col gap-5 px-5 pb-8 pt-0 md:gap-[22px] md:pt-8">
      <CabeceraWizardProducto titulo={titulo} paso={paso} total={total} onCerrar={pedirCerrar} />
      <div className="max-md:hidden">{desktop}</div>
      {children}
      <HojaSalirWizard
        abierta={confirma}
        onSeguir={() => setConfirma(false)}
        onSalir={() => {
          setConfirma(false)
          onSalir()
        }}
      />
    </main>
  )
}
