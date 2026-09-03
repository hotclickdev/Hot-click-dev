import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import FormularioPorPasos from './FormularioPorPasos'
import type { PasoFormulario } from './formularioPorPasosHelpers'
import {
  TIPOS_METODO_COBRO,
  type TipoMetodoCobro,
  crearMetodoCobro,
  validarDatoMetodo,
} from './metodosCobroDatos'
import { Campo, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import TarjetaOpcion from './motion/TarjetaOpcion'
import RevisionMetodoCobro from './motion/RevisionMetodoCobro'
import { ListaStagger, ItemListaStagger } from './motion/ListaStagger'

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
        <div role="radiogroup" aria-label="Tipo de método">
          <ListaStagger className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TIPOS_METODO_COBRO.map((opcion) => (
              <ItemListaStagger key={opcion.tipo}>
                <TarjetaOpcion
                  titulo={opcion.titulo}
                  ayuda={opcion.ayuda}
                  seleccionado={tipo === opcion.tipo}
                  atenuar={tipo != null && tipo !== opcion.tipo}
                  checkLayoutId="cobro-tipo-check"
                  onSelect={() => setTipo(opcion.tipo)}
                />
              </ItemListaStagger>
            ))}
          </ListaStagger>
        </div>
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
        <RevisionMetodoCobro tipo={tipo} dato={dato} />
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
