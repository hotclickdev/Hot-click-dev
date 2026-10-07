import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { aprobacionService } from '@/services/aprobacionService'
import { reporteProductoService } from '@/services/moderacionService'
import { testimonioService } from '@/services/testimonioService'
import { filasDe, idSeguro, texto, type Fila } from './normalizar'
import { IconoDominio } from './iconos'
import { Aviso, Carga, Chip, Encabezado, FilaDecision, Marco, MarcoIcono, Segmento, TARJETA } from './piezas'

export default function ModeracionPlataforma() {
  const navigate = useNavigate()
  const reportes = useLocation().pathname.endsWith('/reportes')
  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Revisar" detalle="Cola: un negocio pide entrar, una oferta, una cuenta para cobrar o un testimonio. Reportes: un comprador marcó un producto y hay que decidir si se retira." />
      <Segmento
        opciones={[{ id: 'cola', label: 'Cola' }, { id: 'reportes', label: 'Reportes' }]}
        valor={reportes ? 'reportes' : 'cola'}
        onChange={(id) => navigate(id === 'reportes' ? '/plataforma/moderacion/reportes' : '/plataforma/moderacion')}
      />
      {reportes ? <Reportes /> : <Cola />}
    </div>
  )
}

function Cola() {
  const [grupos, setGrupos] = useState<Array<{ titulo: string; filas: Fila[]; fallo: boolean }>>([])
  const [listo, setListo] = useState(false)
  const [marca, setMarca] = useState(0)

  useEffect(() => {
    const cargas = [
      ['Negocios', () => aprobacionService.listEmpresas()],
      ['Ofertas', () => aprobacionService.listOfertas()],
      ['Métodos de cobro', () => aprobacionService.listMetodosCobro()],
      ['Testimonios', () => testimonioService.getAdmin()],
    ] as const
    void Promise.allSettled(cargas.map(([, cargar]) => cargar())).then((resultados) => {
      setGrupos(resultados.map((resultado, i) => ({
        titulo: cargas[i][0],
        filas: resultado.status === 'fulfilled' ? filasDe(resultado.value.data) : [],
        fallo: resultado.status === 'rejected',
      })))
      setListo(true)
    })
  }, [marca])

  if (!listo) return <Carga />
  const total = grupos.reduce((suma, grupo) => suma + grupo.filas.length, 0)
  return (
    <Marco
      principal={
        <div className="flex flex-col gap-4">
          {grupos.map((grupo) => (
            <section key={grupo.titulo} className="flex flex-col gap-3">
              {grupo.fallo && <Aviso>{`No se pudo cargar ${grupo.titulo}.`}</Aviso>}
              {grupo.filas.map((fila) => (
                <Decision key={`${grupo.titulo}-${idSeguro(fila)}`} grupo={grupo.titulo} fila={fila} onListo={() => setMarca((n) => n + 1)} />
              ))}
            </section>
          ))}
          {total === 0 && <Aviso>Nada en la cola. Acá llegan negocios por aprobar, ofertas, cuentas de cobro y testimonios.</Aviso>}
        </div>
      }
      lado={<Tablero grupos={grupos} total={total} />}
    />
  )
}

function Tablero({ grupos, total }: { grupos: Array<{ titulo: string; filas: Fila[]; fallo: boolean }>; total: number }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-white">
      <div className="flex items-center justify-between border-b border-hc-n-200 bg-hc-n-50 px-4 py-3">
        <h2 className="font-display text-[17px] font-bold">Colas</h2>
        <Chip tono={total > 0 ? 'alerta' : 'ok'}>{total > 0 ? `${total} en espera` : 'Al día'}</Chip>
      </div>
      <div className="grid grid-cols-[1fr_5rem_6rem] gap-2 px-4 py-2 text-xs font-semibold text-hc-n-600">
        <span>Cola</span><span>En espera</span><span>Estado</span>
      </div>
      {grupos.map((grupo) => (
        <div key={grupo.titulo} className="grid grid-cols-[1fr_5rem_6rem] items-center gap-2 border-t border-hc-n-200 px-4 py-3">
          <span className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-hc-blue-50 text-hc-blue-600">
              <IconoDominio id={iconoGrupo(grupo.titulo)} className="size-4" />
            </span>
            {grupo.titulo}
          </span>
          <span className="font-display text-lg font-extrabold">{grupo.filas.length}</span>
          <Chip tono={grupo.filas.length > 0 ? 'alerta' : 'ok'}>{grupo.filas.length > 0 ? 'Revisar' : 'Al día'}</Chip>
        </div>
      ))}
    </div>
  )
}

function iconoGrupo(titulo: string): string {
  if (titulo === 'Negocios') return 'negocios'
  if (titulo === 'Ofertas') return 'dinero'
  if (titulo === 'Métodos de cobro') return 'dinero'
  return 'moderacion'
}

function Decision({ grupo, fila, onListo }: { grupo: string; fila: Fila; onListo: () => void }) {
  const id = idSeguro(fila)
  if (!id) return null
  const titulo = texto(fila.nombreComercial, texto(fila.nombre, texto(fila.titulo, 'Ítem')))
  return (
    <FilaDecision
      titulo={titulo}
      icono={iconoGrupo(grupo)}
      meta={metaDecision(grupo, fila)}
      onAprobar={async () => { await aprobar(grupo, id); onListo() }}
      onRechazar={async (motivo) => { await rechazar(grupo, id, motivo); onListo() }}
    />
  )
}

function metaDecision(grupo: string, fila: Fila): string {
  const quien = texto(fila.correo, texto(fila.usuarioNombre, texto(fila.nombreEmpresa, grupo)))
  const que = texto(fila.titulo, texto(fila.nombre, texto(fila.estado, grupo)))
  return `${quien} · ${que}`
}

function aprobar(grupo: string, id: string) {
  if (grupo === 'Negocios') return aprobacionService.aprobarEmpresa(id)
  if (grupo === 'Ofertas') return aprobacionService.aprobarOferta(id)
  if (grupo === 'Métodos de cobro') return aprobacionService.aprobarMetodoCobro(id)
  return testimonioService.aprobar(id)
}

function rechazar(grupo: string, id: string, motivo: string) {
  if (grupo === 'Negocios') return aprobacionService.rechazarEmpresa(id, motivo)
  if (grupo === 'Ofertas') return aprobacionService.rechazarOferta(id, motivo)
  if (grupo === 'Métodos de cobro') return aprobacionService.rechazarMetodoCobro(id, motivo)
  return testimonioService.rechazar(id)
}

function Reportes() {
  const { filas, listo, fallo, recargar } = useReportes()
  if (!listo) return <Carga />
  if (fallo) return <Aviso>No se pudieron cargar los reportes.</Aviso>
  if (filas.length === 0) return <Aviso>Nadie reportó un producto. Cuando un comprador marca uno, el motivo y el producto aparecen acá para resolverlo.</Aviso>
  return (
    <ul className="flex flex-col gap-3">
      {filas.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        return (
          <li key={id} className={`${TARJETA} flex items-start gap-3`}>
            <MarcoIcono id="moderacion" />
            <div>
            <p className="font-display text-[17px] font-bold">{texto(fila.productoNombre, 'Producto')}</p>
            <p className="mt-1 text-xs text-hc-n-600">{texto(fila.motivo, 'Sin motivo')} · {texto(fila.detalle, '')}</p>
            <button type="button" className="mt-3 text-sm font-semibold text-hc-blue-600" onClick={() => void resolver(id, false, recargar)}>
              Resolver
            </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function useReportes() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [listo, setListo] = useState(false)
  const [fallo, setFallo] = useState(false)
  function recargar() {
    setListo(false)
    reporteProductoService.listarPendientes()
      .then((r) => { setFilas(filasDe(r.data)); setFallo(false) })
      .catch((err: unknown) => { console.error(err); setFallo(true) })
      .finally(() => setListo(true))
  }
  useEffect(() => { recargar() }, [])
  return { filas, listo, fallo, recargar }
}

async function resolver(id: string, pausar: boolean, recargar: () => void) {
  try {
    await reporteProductoService.resolver(id, 'RESUELTO', 'Resuelto desde la consola', pausar)
    recargar()
  } catch (err) {
    console.error(err)
  }
}
