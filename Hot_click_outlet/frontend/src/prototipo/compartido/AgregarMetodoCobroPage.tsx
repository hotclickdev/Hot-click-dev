import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import FormularioPorPasos from './FormularioPorPasos'
import type { PasoFormulario } from './formularioPorPasosHelpers'
import CampoDatoCobro from './CampoDatoCobro'
import {
  TIPOS_METODO_COBRO,
  cargarMetodosCobro,
  cuentaCobroEditable,
  crearMetodoCobro,
  solicitarCambioMetodoCobro,
  type TipoMetodoCobro,
  validarDatoMetodo,
} from './metodosCobroDatos'
import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import TarjetaOpcion from './motion/TarjetaOpcion'
import RevisionMetodoCobro from './motion/RevisionMetodoCobro'
import { ListaStagger, ItemListaStagger } from './motion/ListaStagger'

const PASOS_ALTA: readonly PasoFormulario[] = [
  { id: 'tipo', titulo: 'Tipo de cuenta' },
  { id: 'datos', titulo: 'Datos de la cuenta' },
  { id: 'confirmar', titulo: 'Revisá los datos' },
]

const PASOS_EDIT: readonly PasoFormulario[] = [
  { id: 'datos', titulo: 'Datos de la cuenta' },
  { id: 'confirmar', titulo: 'Revisá los datos' },
]

type Props = Readonly<{
  volverA: string
  rutaExito?: string
  soloFormulario?: boolean
}>

/**
 * Wizard de método de cobro: alta inmediata (SINPE/IBAN) o cambio en revisión.
 */
export function AgregarMetodoCobroPage({
  volverA,
  rutaExito,
  soloFormulario = false,
}: Props) {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const idEditar = params.get('editar')
  const editando = Boolean(idEditar)
  const pasos = editando ? PASOS_EDIT : PASOS_ALTA
  const [paso, setPaso] = useState(0)
  const [tipo, setTipo] = useState<TipoMetodoCobro | null>(null)
  const [dato, setDato] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cargandoEdit, setCargandoEdit] = useState(editando)
  const [bloqueado, setBloqueado] = useState<string | null>(null)
  const idPaso = pasos[paso]?.id
  const destino = rutaExito ?? volverA

  useEffect(() => {
    if (!idEditar) return
    let vivo = true
    cargarMetodosCobro()
      .then((carga) => {
        if (!vivo) return
        const actual = carga.metodos.find((m) => m.id === idEditar)
        if (!actual) {
          setBloqueado('No encontramos esa cuenta.')
          return
        }
        if (!cuentaCobroEditable(actual.tipo) || actual.enRevision) {
          setBloqueado(
            actual.enRevision
              ? 'Este método ya está en revisión.'
              : 'Las cuentas tarjeta no se editan. Agregá SINPE o IBAN.',
          )
          return
        }
        setTipo(actual.tipo)
      })
      .finally(() => {
        if (vivo) setCargandoEdit(false)
      })
    return () => { vivo = false }
  }, [idEditar])

  function validar(i: number): string | null {
    const id = pasos[i]?.id
    if (id === 'tipo' && !tipo) return 'Elegí un tipo de cuenta.'
    if (id === 'datos' && tipo) return validarDatoMetodo(tipo, dato)
    return null
  }

  async function guardar() {
    if (!tipo) return
    setGuardando(true)
    try {
      if (idEditar) {
        await solicitarCambioMetodoCobro(idEditar, tipo, dato)
        toast({ message: 'Cambio enviado a revisión', type: 'success' })
      } else {
        await crearMetodoCobro(tipo, dato)
        toast({ message: 'Método de cobro guardado', type: 'success' })
      }
      navigate(destino)
    } catch {
      toast({
        message: idEditar ? 'No se pudo enviar el cambio' : 'No se pudo guardar el método de cobro',
        type: 'error',
      })
    } finally {
      setGuardando(false)
    }
  }

  const indiceDatos = pasos.findIndex((p) => p.id === 'datos')

  if (cargandoEdit) {
    return <p className="text-[13px] text-hc-muted">Cargando cuenta…</p>
  }
  if (bloqueado) {
    return <p className="text-sm text-hc-muted">{bloqueado}</p>
  }

  const wizard = (
    <FormularioPorPasos
      pasos={pasos}
      pasoActual={paso}
      onPasoChange={setPaso}
      validarPaso={validar}
      onFinalizar={guardar}
      etiquetaFinal={editando ? 'Enviar a revisión' : 'Guardar método'}
      enviando={guardando}
    >
      {idPaso === 'tipo' ? (
        <div role="radiogroup" aria-label="Tipo de método">
          <ListaStagger className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <CampoDatoCobro tipo={tipo} value={dato} onChange={setDato} />
      ) : null}
      {idPaso === 'confirmar' && tipo ? (
        <RevisionMetodoCobro
          tipo={tipo}
          dato={dato}
          onEditar={() => setPaso(indiceDatos < 0 ? 0 : indiceDatos)}
        />
      ) : null}
    </FormularioPorPasos>
  )

  if (soloFormulario) return wizard

  return (
    <main className="px-5 pb-8 pt-[60px] md:max-w-[760px] md:px-12 md:py-12 md:pt-12">
      <EncabezadoPagina
        titulo={editando ? 'Editar método de cobro' : 'Agregar método de cobro'}
        volverA={volverA}
      />
      {wizard}
    </main>
  )
}

export default function AgregarMetodoCobroSellerPage() {
  const ruta = useSellerRuta()
  return <AgregarMetodoCobroPage volverA={ruta('cobro')} rutaExito={ruta('cobro')} />
}
