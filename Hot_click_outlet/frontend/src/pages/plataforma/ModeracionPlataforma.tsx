import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { aprobacionService } from '@/services/aprobacionService'
import { reporteProductoService } from '@/services/moderacionService'
import { testimonioService } from '@/services/testimonioService'
import { filasDe, idSeguro, texto, type Fila } from './normalizar'
import { Aviso, Carga, FilaDecision, Segmento, TARJETA } from './piezas'

export default function ModeracionPlataforma() {
  const navigate = useNavigate()
  const reportes = useLocation().pathname.endsWith('/reportes')
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-[22px] font-bold text-hc-n-900">Moderación</h1>
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
  const vacia = grupos.every((g) => g.filas.length === 0 && !g.fallo)
  return (
    <div className="flex flex-col gap-4">
      {vacia && <Aviso>Nada pendiente.</Aviso>}
      {grupos.map((grupo) => (
        <section key={grupo.titulo} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-hc-n-600">{grupo.titulo}</h2>
          {grupo.fallo && <Aviso>{`No se pudo cargar ${grupo.titulo}.`}</Aviso>}
          {grupo.filas.map((fila) => (
            <Decision key={`${grupo.titulo}-${idSeguro(fila)}`} grupo={grupo.titulo} fila={fila} onListo={() => setMarca((n) => n + 1)} />
          ))}
        </section>
      ))}
    </div>
  )
}

function Decision({ grupo, fila, onListo }: { grupo: string; fila: Fila; onListo: () => void }) {
  const id = idSeguro(fila)
  if (!id) return null
  const titulo = texto(fila.nombreComercial, texto(fila.nombre, texto(fila.titulo, 'Ítem')))
  return (
    <FilaDecision
      titulo={titulo}
      meta={texto(fila.estado, grupo)}
      onAprobar={async () => { await aprobar(grupo, id); onListo() }}
      onRechazar={async (motivo) => { await rechazar(grupo, id, motivo); onListo() }}
    />
  )
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
  if (filas.length === 0) return <Aviso>Nada pendiente.</Aviso>
  return (
    <ul className="flex flex-col gap-3">
      {filas.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        return (
          <li key={id} className={TARJETA}>
            <p className="font-display text-[17px] font-bold">{texto(fila.productoNombre, 'Producto')}</p>
            <p className="mt-1 text-xs text-hc-n-600">{texto(fila.motivo, 'Sin motivo')} · {texto(fila.detalle, '')}</p>
            <button type="button" className="mt-3 text-sm font-semibold text-hc-blue-600" onClick={() => void resolver(id, false, recargar)}>
              Resolver
            </button>
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
