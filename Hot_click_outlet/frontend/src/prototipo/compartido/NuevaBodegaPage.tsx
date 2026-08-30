import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boton, Campo, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { crearBodegaVendedor } from './bodegasVendedorApi'

/**
 * Alta de bodega (Figma 78:325).
 */
export default function NuevaBodegaPage() {
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [encargado, setEncargado] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!nombre.trim() || !ubicacion.trim()) {
      setError('Nombre y ubicación son obligatorios.')
      return
    }
    try {
      await crearBodegaVendedor(nombre, ubicacion, encargado)
      navigate(ruta('bodegas'))
    } catch (err: unknown) {
      console.error('[NuevaBodega]', err)
      setError('No se pudo guardar la bodega.')
    }
  }

  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Nueva Bodega" volverA={ruta('bodegas')} />
      <form onSubmit={(e) => void guardar(e)}>
        <Campo etiqueta="Nombre de la bodega" value={nombre} onChange={setNombre} placeholder="Ej: Bodega Central" />
        <Campo etiqueta="Ubicación" value={ubicacion} onChange={setUbicacion} placeholder="Ej: San José, Costa Rica" />
        <Campo etiqueta="Encargado (opcional)" value={encargado} onChange={setEncargado} placeholder="Ej: Sofía Vargas" />
        {error ? <p className="mb-3 text-sm text-hc-danger">{error}</p> : null}
        <Boton type="submit">Guardar bodega</Boton>
      </form>
    </main>
  )
}
