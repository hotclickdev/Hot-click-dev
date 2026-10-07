import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { consolaService } from './consola'
import { filasDe, texto, type Fila } from './normalizar'
import { Aviso, Carga, TARJETA } from './piezas'

export default function CompradorPlataforma() {
  const { id = '' } = useParams()
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')

  useEffect(() => {
    consolaService.comprador(id)
      .then((respuesta) => { setFilas(filasDe(respuesta.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [id])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[28px] font-extrabold leading-8">Comprador</h1>
      <p className="text-sm text-hc-n-600">Pedidos en los que HotClick contesta, con la tienda de cada uno.</p>
      {estado === 'carga' && <Carga />}
      {estado === 'error' && <Aviso>No se pudo abrir la ficha del comprador.</Aviso>}
      {estado === 'listo' && filas.length === 0 && <Aviso>Este comprador no tiene pedidos.</Aviso>}
      <ul className="flex flex-col gap-2">
        {filas.map((fila) => (
          <li key={texto(fila.id)} className={TARJETA}>
            <Link className="font-semibold text-hc-blue-600" to={`/plataforma/pedidos/${texto(fila.id)}`}>
              {texto(fila.numero, 'Pedido')}
            </Link>
            <p className="mt-1 text-sm text-hc-n-600">
              {texto(fila.fecha, 'Sin hora')} · {texto(fila.empresaNombre, 'Negocio')} · {texto(fila.estado, '—')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
