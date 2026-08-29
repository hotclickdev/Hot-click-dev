import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { crearBodegaVendedor } from '@/prototipo/compartido/bodegasVendedorApi'
import BotonPrimario from '../ui/BotonPrimario'
import CampoTexto from '../ui/CampoTexto'
import EmprendedorPageFrame, { EmprendedorCard } from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'

/**
 * Nueva bodega (Figma 78:150 / 352:10492).
 */
export default function NuevaBodegaPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [encargado, setEncargado] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!nombre.trim() || !ubicacion.trim()) {
      setError('Nombre y ubicación son obligatorios.')
      return
    }
    setGuardando(true)
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
      <form className="flex flex-col gap-4" onSubmit={(e) => void guardar(e)}>
        <EmprendedorCard className="flex flex-col gap-4">
          <CampoTexto
            etiqueta="Nombre de la bodega"
            value={nombre}
            onChange={setNombre}
            placeholder="Ej: Bodega Central"
          />
          <CampoTexto
            etiqueta="Ubicación"
            value={ubicacion}
            onChange={setUbicacion}
            placeholder="Ej: San José, Costa Rica"
          />
          <CampoTexto
            etiqueta="Encargado (opcional)"
            value={encargado}
            onChange={setEncargado}
            placeholder="Ej: Sofía Vargas"
          />
        </EmprendedorCard>
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        <BotonPrimario type="submit">{guardando ? 'Guardando…' : 'Guardar bodega'}</BotonPrimario>
      </form>
    </EmprendedorPageFrame>
  )
}
