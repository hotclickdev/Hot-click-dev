import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearBodegaVendedor } from '@/prototipo/compartido/bodegasVendedorApi'
import CampoTexto from '../ui/CampoTexto'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import FormularioPorPasos from '@/prototipo/compartido/FormularioPorPasos'
import type { PasoFormulario } from '@/prototipo/compartido/formularioPorPasosHelpers'

const PASOS: readonly PasoFormulario[] = [
  { id: 'nombre', titulo: 'Nombre de la bodega' },
  { id: 'ubicacion', titulo: 'Ubicación' },
  { id: 'encargado', titulo: 'Encargado', opcional: true },
]

/**
 * Nueva bodega (wizard).
 */
export default function NuevaBodegaPage() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [encargado, setEncargado] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const idPaso = PASOS[paso]?.id

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
      navigate(`${RUTA_EMPRENDEDOR}/opciones/bodegas`)
    } catch (err: unknown) {
      console.error('[NuevaBodega]', err)
      setError('No se pudo guardar la bodega.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <EmprendedorPageFrame titulo="Nueva Bodega" volverA={`${RUTA_EMPRENDEDOR}/opciones/bodegas`}>
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
          <CampoTexto
            etiqueta="Nombre de la bodega"
            value={nombre}
            onChange={setNombre}
            placeholder="Ej: Bodega Central"
          />
        ) : null}
        {idPaso === 'ubicacion' ? (
          <CampoTexto
            etiqueta="Ubicación"
            value={ubicacion}
            onChange={setUbicacion}
            placeholder="Ej: San José, Costa Rica"
          />
        ) : null}
        {idPaso === 'encargado' ? (
          <CampoTexto
            etiqueta="Encargado (opcional)"
            value={encargado}
            onChange={setEncargado}
            placeholder="Ej: Sofía Vargas"
          />
        ) : null}
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
      </FormularioPorPasos>
    </EmprendedorPageFrame>
  )
}
