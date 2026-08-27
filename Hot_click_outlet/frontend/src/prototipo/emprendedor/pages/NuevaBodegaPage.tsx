import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useEmprendedorDemoStore } from '../store/emprendedorDemoStore'

/**
 * Nueva bodega (Figma 78:150).
 */
export default function NuevaBodegaPage() {
  const navigate = useNavigate()
  const agregarBodega = useEmprendedorDemoStore((estado) => estado.agregarBodega)
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [encargado, setEncargado] = useState('')
  const [error, setError] = useState<string | null>(null)

  function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!nombre.trim() || !ubicacion.trim()) {
      setError('Nombre y ubicación son obligatorios.')
      return
    }
    agregarBodega(nombre, ubicacion)
    navigate(`${RUTA_EMPRENDEDOR}/opciones/bodegas`)
  }

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-8">
      <CabeceraAtras titulo="Nueva Bodega" to={`${RUTA_EMPRENDEDOR}/opciones/bodegas`} />
      <form className="flex flex-col gap-5" onSubmit={guardar}>
        <CampoTexto etiqueta="Nombre de la bodega" value={nombre} onChange={setNombre} placeholder="Ej: Bodega Central" />
        <CampoTexto etiqueta="Ubicación" value={ubicacion} onChange={setUbicacion} placeholder="Ej: San José, Costa Rica" />
        <CampoTexto etiqueta="Encargado (opcional)" value={encargado} onChange={setEncargado} placeholder="Ej: Sofía Vargas" />
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        <BotonPrimario type="submit">Guardar bodega</BotonPrimario>
      </form>
    </main>
  )
}
