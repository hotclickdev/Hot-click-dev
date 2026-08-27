import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import { RUTA_EMPRENDEDOR } from '../constants'
import { warehouseService } from '@/services/orderService'

/**
 * Nueva bodega (Figma 78:150).
 */
export default function NuevaBodegaPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [encargado, setEncargado] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-8">
      <CabeceraAtras titulo="Nueva Bodega" to={`${RUTA_EMPRENDEDOR}/opciones/bodegas`} />
      <form className="flex flex-col gap-5" onSubmit={(evento) => void guardar(evento)}>
        <CampoTexto etiqueta="Nombre de la bodega" value={nombre} onChange={setNombre} placeholder="Ej: Bodega Central" />
        <CampoTexto etiqueta="Ubicación" value={ubicacion} onChange={setUbicacion} placeholder="Ej: San José, Costa Rica" />
        <CampoTexto etiqueta="Encargado (opcional)" value={encargado} onChange={setEncargado} placeholder="Ej: Sofía Vargas" />
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        <BotonPrimario type="submit">Guardar bodega</BotonPrimario>
      </form>
    </main>
  )

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    try {
      await warehouseService.create({
        nombreBodega: nombre,
        direccionExacta: ubicacion,
        encargado,
      })
    } catch (err) {
      console.error('[prototipo emprendedor] bodega', err)
      setError('No se guardó en el servidor. El prototipo vuelve a la lista.')
    }
    navigate(`${RUTA_EMPRENDEDOR}/opciones/bodegas`)
  }
}
