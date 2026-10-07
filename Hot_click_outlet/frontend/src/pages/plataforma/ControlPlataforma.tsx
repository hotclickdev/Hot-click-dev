import { useEffect, useState } from 'react'
import { consolaService, objetoDe } from './consola'
import { campoLista, texto, type Fila } from './normalizar'
import { GraficaBarras, GraficaFilas } from './graficas'
import { Aviso, Carga, TARJETA } from './piezas'
import { usePulso } from './usePulso'

/** Control con la fecha real del pedido. Sin visitas inventadas. */
export default function ControlPlataforma() {
  const semana = usePulso(7)
  const mes = usePulso(30)
  const [movimiento, setMovimiento] = useState<Fila | null>(null)
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')

  useEffect(() => {
    consolaService.movimiento(30)
      .then((respuesta) => { setMovimiento(objetoDe(respuesta.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [])

  const dias = campoLista(movimiento, 'dias')
  const horas = campoLista(movimiento, 'horas')
  const productos = campoLista(movimiento, 'productos')
  const categorias = campoLista(movimiento, 'categorias')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-[28px] font-extrabold leading-8">Control</h1>
        <p className="mt-1 text-sm text-hc-n-600">Qué se vende, en qué día y a qué hora. La hora es la del pedido, no una visita.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <GraficaBarras
          titulo="Pedidos pagados"
          detalle="Comparación de 7 y 30 días. El valor es la cantidad de pedidos pagados del embudo."
          serie={[
            { etiqueta: '7 días', valor: semana?.pago ?? 0 },
            { etiqueta: '30 días', valor: mes?.pago ?? 0 },
          ]}
        />
        <GraficaFilas
          titulo="Pasos en 7 días"
          detalle="De la visita al pago."
          serie={[
            { etiqueta: 'Visitas', valor: semana?.visitas ?? 0 },
            { etiqueta: 'Producto', valor: semana?.producto ?? 0 },
            { etiqueta: 'Carrito', valor: semana?.carrito ?? 0, tono: 'rojo' },
            { etiqueta: 'Pagados', valor: semana?.pago ?? 0, tono: 'verde' },
          ]}
        />
      </div>
      {estado === 'carga' && <Carga />}
      {estado === 'error' && <Aviso>No se pudo leer el movimiento de los pedidos.</Aviso>}
      {estado === 'listo' && movimiento?.hayDatos !== true && <Aviso>No hay pedidos pagados en estos 30 días.</Aviso>}
      {estado === 'listo' && movimiento?.hayDatos === true && (
        <div className="grid gap-4 xl:grid-cols-2">
          <GraficaBarras
            titulo="Día de la semana"
            detalle="Pedidos pagados según la fecha del pedido."
            serie={dias.map((fila) => ({ etiqueta: texto(fila.etiqueta), valor: numero(fila.pedidos) }))}
          />
          <GraficaFilas
            titulo="Hora del pedido"
            detalle="Solo las horas en las que hubo un pedido."
            serie={horas.map((fila) => ({ etiqueta: texto(fila.etiqueta), valor: numero(fila.pedidos) }))}
          />
          <Ranking titulo="Productos" filas={productos} />
          <Ranking titulo="Categorías" filas={categorias} />
        </div>
      )}
    </div>
  )
}

function Ranking({ titulo, filas }: { titulo: string; filas: Fila[] }) {
  if (filas.length === 0) return null
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">{titulo}</h2>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {filas.map((fila) => (
          <li key={texto(fila.nombre)} className="flex justify-between gap-3 border-t border-hc-n-200 pt-2">
            <span className="font-semibold">{texto(fila.nombre)}</span>
            <span>{texto(fila.unidades)} u · {texto(fila.ingresos)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function numero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}
