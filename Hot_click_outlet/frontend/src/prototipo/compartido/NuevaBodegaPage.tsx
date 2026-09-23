import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Campo, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { crearBodegaVendedor } from './bodegasVendedorApi'
import FormularioPorPasos from './FormularioPorPasos'
import type { PasoFormulario } from './formularioPorPasosHelpers'

const PASOS: readonly PasoFormulario[] = [
  { id: 'nombre', titulo: 'Nombre de la bodega' },
  { id: 'ubicacion', titulo: 'Ubicación' },
  { id: 'encargado', titulo: 'Encargado', opcional: true },
]

type Props = Readonly<{
  volverA: string
  rutaExito?: string
  /** Solo wizard (sin main/encabezado); para shell Emprendedor. */
  soloFormulario?: boolean
}>

/**
 * Alta de bodega (Figma 78:325) — wizard conversacional.
 */
export function NuevaBodegaPage({
  volverA,
  rutaExito,
  soloFormulario = false,
}: Props) {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [encargado, setEncargado] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const idPaso = PASOS[paso]?.id
  const destino = rutaExito ?? volverA

  function validar(i: number): string | null {
    const id = PASOS[i]?.id
    if (id === 'nombre' && !nombre.trim()) return 'El nombre es obligatorio.'
    if (id === 'ubicacion' && !ubicacion.trim()) return 'La ubicación es obligatoria.'
    return null
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await crearBodegaVendedor(nombre, ubicacion, encargado)
      navigate(destino)
    } catch (err: unknown) {
      console.error('[NuevaBodega]', err)
      setError('No se pudo guardar la bodega.')
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
      etiquetaFinal="Guardar bodega"
      enviando={guardando}
    >
      {idPaso === 'nombre' ? (
        <Campo
          etiqueta="Nombre de la bodega"
          value={nombre}
          onChange={setNombre}
          placeholder="Ej: Bodega Central"
        />
      ) : null}
      {idPaso === 'ubicacion' ? (
        <Campo
          etiqueta="Ubicación"
          value={ubicacion}
          onChange={setUbicacion}
          placeholder="Ej: San José, Costa Rica"
        />
      ) : null}
      {idPaso === 'encargado' ? (
        <Campo
          etiqueta="Encargado (opcional)"
          value={encargado}
          onChange={setEncargado}
          placeholder="Ej: Sofía Vargas"
        />
      ) : null}
      {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
    </FormularioPorPasos>
  )

  if (soloFormulario) return wizard

  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Nueva Bodega" volverA={volverA} />
      {wizard}
    </main>
  )
}

/** Default para SellerRoutes: resuelve rutas con useSellerRuta. */
export default function NuevaBodegaSellerPage() {
  const ruta = useSellerRuta()
  return <NuevaBodegaPage volverA={ruta('bodegas')} rutaExito={ruta('bodegas')} />
}
