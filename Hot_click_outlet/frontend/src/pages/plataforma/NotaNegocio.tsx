import { useEffect, useState } from 'react'
import { consolaService, objetoDe } from './consola'
import { accionNota, ACCIONES_NOTA, notaDe } from './notaAccion'
import { campoLista, texto, type Fila } from './normalizar'
import { TARJETA } from './piezas'

export function NotaNegocio({ empresaId, negocio, filas, onGuardada }: {
  empresaId: string
  negocio: string
  filas?: Fila[]
  onGuardada?: () => void
}) {
  const [detalle, setDetalle] = useState('')
  const [abierta, setAbierta] = useState(false)
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [propias, setPropias] = useState<Fila[]>([])
  const [marca, setMarca] = useState(0)
  const lista = filas ?? propias

  useEffect(() => {
    setDetalle('')
    setAbierta(false)
    setAviso('')
  }, [empresaId])

  useEffect(() => {
    if (filas || !empresaId) return
    consolaService.ficha(empresaId)
      .then((respuesta) => setPropias(campoLista(objetoDe(respuesta.data), 'notas')))
      .catch((err: unknown) => { console.error(err) })
  }, [empresaId, filas, marca])

  async function elegir(id: string) {
    const arma = notaDe(id, detalle)
    const nombre = accionNota(id)?.label
    if (!arma || !empresaId || !nombre) return
    setOcupado(true)
    setAviso('')
    try {
      await consolaService.nota(empresaId, arma.nota, arma.proximaAccion, arma.bandeja)
      setDetalle('')
      setAbierta(false)
      setAviso(`Quedó en ${nombre}.`)
      setMarca((valor) => valor + 1)
      onGuardada?.()
    } catch (err) {
      console.error(err)
      setAviso('No se pudo guardar la nota.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">Nota del negocio</h2>
      <p className="mt-1 text-sm font-semibold">{negocio || 'Elegí la tienda en la lista.'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {ACCIONES_NOTA.map((accion) => (
          <button
            key={accion.id}
            type="button"
            disabled={!empresaId || ocupado}
            onClick={() => void elegir(accion.id)}
            className="rounded-[14px] border border-hc-n-200 bg-hc-surface px-3 py-3 text-left transition-all duration-300 hover:scale-[1.03] hover:border-hc-blue-600 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:scale-100"
          >
            <span className="block text-sm font-semibold">{accion.label}</span>
            <span className="mt-1 block text-xs font-normal text-hc-n-600">{accion.accion}</span>
          </button>
        ))}
      </div>
      {abierta ? (
        <label className="mt-3 block text-xs font-semibold text-hc-n-600">
          Detalle
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            className="mt-1 min-h-20 w-full rounded-xl border border-hc-n-200 px-3 py-2 text-sm font-normal"
          />
        </label>
      ) : (
        <button type="button" className="mt-3 text-sm font-semibold text-hc-blue-600" onClick={() => setAbierta(true)}>
          Agregar un detalle
        </button>
      )}
      {aviso && <p className="mt-2 text-sm font-semibold">{aviso}</p>}
      <ListaNotas filas={lista} />
    </section>
  )
}

function ListaNotas({ filas }: { filas: Fila[] }) {
  if (filas.length === 0) return null
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {filas.slice(0, 4).map((fila) => (
        <li key={texto(fila.id, texto(fila.creada))} className="border-t border-hc-n-200 pt-2 text-sm">
          <p className="font-semibold">{accionNota(texto(fila.bandeja))?.label ?? 'Nota'}</p>
          <p className="text-hc-n-600">{texto(fila.nota)}</p>
        </li>
      ))}
    </ul>
  )
}
