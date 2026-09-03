import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import FormularioPorPasos from './FormularioPorPasos'
import type { PasoFormulario } from './formularioPorPasosHelpers'
import {
  TIPOS_METODO_COBRO,
  type TipoMetodoCobro,
  crearMetodoCobro,
  mascaraDesdeDato,
  nombrePorTipo,
  validarDatoMetodo,
} from './metodosCobroDatos'
import { Campo, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import TarjetaOpcion from './motion/TarjetaOpcion'
import { motion } from 'framer-motion'
import { EASE_PREMIUM } from './motion/formularioMotionTokens'

const PASOS: readonly PasoFormulario[] = [
  { id: 'tipo', titulo: 'Tipo de cuenta' },
  { id: 'datos', titulo: 'Datos de la cuenta' },
  { id: 'confirmar', titulo: 'Confirmá' },
]

type Props = Readonly<{
  volverA: string
  rutaExito?: string
  /** Solo wizard (sin main/encabezado); para shell Emprendedor. */
  soloFormulario?: boolean
}>

/**
 * Wizard único de método de cobro (API /metodos-cobro).
 */
export function AgregarMetodoCobroPage({
  volverA,
  rutaExito,
  soloFormulario = false,
}: Props) {
  const navigate = useNavigate()
  const toast = useToast()
  const [paso, setPaso] = useState(0)
  const [tipo, setTipo] = useState<TipoMetodoCobro | null>(null)
  const [dato, setDato] = useState('')
  const [guardando, setGuardando] = useState(false)
  const idPaso = PASOS[paso]?.id
  const destino = rutaExito ?? volverA

  function validar(i: number): string | null {
    const id = PASOS[i]?.id
    if (id === 'tipo' && !tipo) return 'Elegí un tipo de cuenta.'
    if (id === 'datos' && tipo) return validarDatoMetodo(tipo, dato)
    return null
  }

  async function guardar() {
    if (!tipo) return
    setGuardando(true)
    try {
      await crearMetodoCobro(tipo, dato)
      toast({ message: 'Método de cobro guardado', type: 'success' })
      navigate(destino)
    } catch {
      toast({ message: 'No se pudo guardar el método de cobro', type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  const wizard = (
    <FormularioPorPasos
      pasos={PASOS}
      pasoActual={paso}
      onPasoChange={setPaso}
      validarPaso={validar}
      onFinalizar={guardar}
      etiquetaFinal="Guardar método"
      enviando={guardando}
    >
      {idPaso === 'tipo' ? (
        <motion.div
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Tipo de método"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {TIPOS_METODO_COBRO.map((opcion) => (
            <motion.div
              key={opcion.tipo}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_PREMIUM } },
              }}
            >
              <TarjetaOpcion
                titulo={opcion.titulo}
                ayuda={opcion.ayuda}
                seleccionado={tipo === opcion.tipo}
                atenuar={tipo != null && tipo !== opcion.tipo}
                onSelect={() => setTipo(opcion.tipo)}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : null}
      {idPaso === 'datos' && tipo ? (
        <Campo
          etiqueta={etiquetaDato(tipo)}
          value={dato}
          onChange={setDato}
          placeholder={placeholderDato(tipo)}
        />
      ) : null}
      {idPaso === 'confirmar' && tipo ? (
        <div className="rounded-xl border border-hc-border bg-hc-surface p-4">
          <p className="text-sm font-semibold text-hc-text">{nombrePorTipo(tipo)}</p>
          <p className="mt-1 font-mono text-[13px] text-hc-text">{mascaraDesdeDato(tipo, dato)}</p>
          <p className="mt-2 text-xs text-hc-muted">Se guarda en tu negocio para recibir ingresos de ventas.</p>
        </div>
      ) : null}
    </FormularioPorPasos>
  )

  if (soloFormulario) return wizard

  return (
    <main className="px-5 pb-8 pt-[60px] md:max-w-[760px] md:px-12 md:py-12 md:pt-12">
      <EncabezadoPagina titulo="Agregar método de cobro" volverA={volverA} />
      {wizard}
    </main>
  )
}

/** Default para SellerRoutes: resuelve rutas con useSellerRuta. */
export default function AgregarMetodoCobroSellerPage() {
  const ruta = useSellerRuta()
  return <AgregarMetodoCobroPage volverA={ruta('cobro')} rutaExito={ruta('cobro')} />
}

function etiquetaDato(tipo: TipoMetodoCobro): string {
  if (tipo === 'sinpe') return 'Número SINPE'
  if (tipo === 'iban') return 'IBAN'
  return 'Número de tarjeta (referencia)'
}

function placeholderDato(tipo: TipoMetodoCobro): string {
  if (tipo === 'sinpe') return '8888-0000'
  if (tipo === 'iban') return 'CR21 0000…'
  return '•••• 4412'
}
