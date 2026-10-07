import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { orderService } from '@/services/orderService'
import { consolaService, objetoDe } from './consola'
import { campoLista, texto, type Fila } from './normalizar'
import { enlaceWhatsapp } from './whatsapp'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Chip, Marco, TARJETA } from './piezas'

export default function PedidoDetalle() {
  const { id = '' } = useParams()
  const [fila, setFila] = useState<Fila | null>(null)
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [marca, setMarca] = useState(0)

  useEffect(() => {
    setEstado('carga')
    consolaService.pedido(id)
      .then((respuesta) => {
        const data = objetoDe(respuesta.data)
        setFila(data.id ? data : null)
        setEstado(data.id ? 'listo' : 'error')
      })
      .catch((err: unknown) => {
        console.error(err)
        setEstado('error')
      })
  }, [id, marca])

  if (estado === 'carga') return <Carga />
  if (estado === 'error' || !fila) return <Aviso>No se pudo abrir el pedido.</Aviso>
  return <Cuerpo id={id} fila={fila} onCambio={() => setMarca((n) => n + 1)} />
}

function Cuerpo({ id, fila, onCambio }: { id: string; fila: Fila; onCambio: () => void }) {
  const items = campoLista(fila, 'items')
  const hermanos = campoLista(fila, 'hermanos')
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-hc-n-600">Pedidos / Detalle</p>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-[28px] font-extrabold leading-8">{texto(fila.numero, `Pedido ${id}`)}</h1>
        <Chip tono="azul">{texto(fila.estado, '—')}</Chip>
      </div>
      <Marco
        principal={
          <>
            <Datos fila={fila} />
            <Items pedidoId={id} items={items} onCambio={onCambio} />
            {hermanos.length > 0 && <Hermanos filas={hermanos} />}
          </>
        }
        lado={
          <>
            <Acciones id={id} fila={fila} onCambio={onCambio} />
            <WhatsApp fila={fila} />
          </>
        }
      />
    </div>
  )
}

function Datos({ fila }: { fila: Fila }) {
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">La compra</h2>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <Dato etiqueta="Hora" valor={texto(fila.fecha, '—')} />
        <Dato etiqueta="Comprador" valor={texto(fila.clienteNombre, '—')} />
        <Dato etiqueta="Teléfono" valor={texto(fila.clienteTel, '—')} />
        <Dato etiqueta="Cédula" valor={texto(fila.cedula, '—')} />
        <Dato etiqueta="Negocio" valor={texto(fila.empresaNombre, '—')} />
        <Dato etiqueta="Pago" valor={texto(fila.metodoPago, '—')} />
        <Dato etiqueta="Productos" valor={colones(fila.subtotal)} />
        <Dato etiqueta="Envío" valor={colones(fila.envio)} />
        <Dato etiqueta="Total" valor={colones(fila.total)} />
        <Dato etiqueta="Guía" valor={texto(fila.guia, 'Sin guía')} />
      </dl>
      {texto(fila.direccion) && <p className="mt-3 text-sm text-hc-n-600">{texto(fila.direccion)}</p>}
      {texto(fila.resolucion) && (
        <p className="mt-3 text-sm font-semibold">
          {texto(fila.resolucion)} · {texto(fila.resolucionNota)}
        </p>
      )}
    </section>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-hc-n-600">{etiqueta}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  )
}

function Items({ pedidoId, items, onCambio }: { pedidoId: string; items: Fila[]; onCambio: () => void }) {
  const [alternativas, setAlternativas] = useState<Fila[]>([])
  const [error, setError] = useState('')
  async function marcar(itemId: string) {
    setError('')
    try {
      const respuesta = await consolaService.sinInventario(pedidoId, itemId)
      setAlternativas(campoLista(objetoDe(respuesta.data), 'alternativas'))
      onCambio()
    } catch (err) {
      console.error(err)
      setError('No se pudo marcar la línea.')
    }
  }
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">Líneas</h2>
      {error && <p className="mt-2 text-sm text-hc-primary-text">{error}</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={texto(item.id)} className="flex flex-wrap items-center justify-between gap-2 border-t border-hc-n-200 pt-2">
            <span>
              <span className="font-semibold">{texto(item.nombre, 'Producto')}</span>
              <span className="mt-0.5 block text-xs text-hc-n-600">
                {texto(item.cantidad, '0')} × {colones(item.precio)} · stock {texto(item.stock, '0')}
                {item.sinInventario === true ? ' · sin inventario' : ''}
              </span>
            </span>
            <button type="button" className={`${BOTON_SECUNDARIO} h-10`} onClick={() => void marcar(texto(item.id))}>
              Sin inventario
            </button>
          </li>
        ))}
      </ul>
      {alternativas.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-hc-n-600">De esa tienda, con stock</p>
          <ul className="mt-1 text-sm">
            {alternativas.map((fila) => (
              <li key={texto(fila.id)}>{texto(fila.nombre)} · stock {texto(fila.stock)} · {colones(fila.precio)}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function Hermanos({ filas }: { filas: Fila[] }) {
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">La misma compra, otras tiendas</h2>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {filas.map((fila) => (
          <li key={texto(fila.id)}>
            <Link className="font-semibold text-hc-blue-600" to={`/plataforma/pedidos/${texto(fila.id)}`}>
              {texto(fila.numero, 'Pedido')} · {texto(fila.empresaNombre, 'Negocio')}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Acciones({ id, fila, onCambio }: { id: string; fila: Fila; onCambio: () => void }) {
  const [guia, setGuia] = useState(texto(fila.guia))
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function correr(accion: () => Promise<unknown>) {
    setOcupado(true)
    setError('')
    try {
      await accion()
      onCambio()
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">Decisión</h2>
      <div className="mt-3 flex flex-col gap-2">
        <button type="button" className={BOTON_PRIMARIO} disabled={ocupado} onClick={() => void correr(() => orderService.updateStatus(id, 'ENVIADO'))}>Marcar enviado</button>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void correr(() => orderService.updateStatus(id, 'ENTREGADO'))}>Marcar entregado</button>
        <label className="text-xs font-semibold text-hc-n-600">
          Guía
          <input value={guia} onChange={(e) => setGuia(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm" />
        </label>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado || guia.trim().length < 3} onClick={() => void correr(() => orderService.asignarGuia(id, guia.trim()))}>Guardar guía</button>
        <label className="text-xs font-semibold text-hc-n-600">
          Reembolso o cambio
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-hc-n-200 px-3 py-2 text-sm" />
        </label>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void correr(() => consolaService.resolucion(id, 'CAMBIO', nota))}>Registrar cambio</button>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => void correr(() => consolaService.resolucion(id, 'REEMBOLSO', nota))}>Registrar reembolso</button>
        {error && <p className="text-sm text-hc-primary-text">{error}</p>}
        <p className="text-xs text-hc-n-600">El registro no devuelve la plata sola.</p>
      </div>
    </section>
  )
}

function WhatsApp({ fila }: { fila: Fila }) {
  const negocio = texto(fila.whatsappNegocio)
  const cliente = texto(fila.clienteTel)
  const numero = texto(fila.numero, 'el pedido')
  const [hora, setHora] = useState('15:00')
  const [propio, setPropio] = useState('')
  const stock = enlaceWhatsapp(negocio, `Hola, soy HotClick. ¿Confirma stock del pedido ${numero}?`)
  const listo = enlaceWhatsapp(negocio, `Hola, soy HotClick. El pedido ${numero} queda listo a las ${hora}.`)
  const libre = enlaceWhatsapp(negocio, propio || `Hola, soy HotClick. Sobre el pedido ${numero}.`)
  const sinStock = enlaceWhatsapp(cliente, `Hola, soy HotClick. En el pedido ${numero} no hay inventario. Podemos cambiar el producto o registrar un reembolso.`)
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">WhatsApp</h2>
      <label className="mt-3 block text-xs font-semibold text-hc-n-600">
        Hora en que queda listo
        <input value={hora} onChange={(e) => setHora(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm" />
      </label>
      <label className="mt-2 block text-xs font-semibold text-hc-n-600">
        Mensaje propio
        <textarea value={propio} onChange={(e) => setPropio(e.target.value)} className="mt-1 min-h-16 w-full rounded-xl border border-hc-n-200 px-3 py-2 text-sm" />
      </label>
      <div className="mt-3 flex flex-col gap-2 text-sm font-semibold">
        <Enlace href={stock} etiqueta="Confirmar stock" />
        <Enlace href={listo} etiqueta="Confirmar que está listo" />
        <Enlace href={libre} etiqueta="Mensaje personalizado" />
        <Enlace href={sinStock} etiqueta="Avisar al comprador" />
      </div>
    </section>
  )
}

function Enlace({ href, etiqueta }: { href: string | null; etiqueta: string }) {
  if (!href) return <span className="text-hc-n-600">{etiqueta}: falta el número</span>
  return <a className="text-hc-blue-600" href={href} target="_blank" rel="noopener noreferrer">{etiqueta}</a>
}

function colones(valor: unknown): string {
  const crudo = typeof valor === 'number' ? valor : Number(texto(valor, ''))
  if (!texto(valor, '') || !Number.isFinite(crudo)) return '—'
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(crudo)
}
