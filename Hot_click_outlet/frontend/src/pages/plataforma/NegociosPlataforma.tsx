import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { adminService } from '@/services/orderService'
import { fiscalService } from '@/services/fiscalService'
import useAuthStore from '@/store/authStore'
import { filtrarNegocios, idSeguro, texto, type Fila } from './normalizar'
import { FichaTienda } from './FichaTienda'
import TiendaRapidaPanel from './TiendaRapidaPanel'
import { Aviso, BOTON_PRIMARIO, Carga, Chip, Encabezado, MarcoIcono, Segmento, TARJETA } from './piezas'
import { useCola } from './useCola'
import { ETIQUETA_DESTACADO, contarDestacados, filtrarPorDestacado, textoOrden } from './destacados'

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'suspendidos', label: 'Suspendidos' },
]

export default function NegociosPlataforma() {
  const { id } = useParams()
  const [rapida, setRapida] = useState(false)
  const [marca, setMarca] = useState(0)
  useEffect(() => { setRapida(false) }, [id])
  if (id && !/^[1-9]\d*$/.test(id)) return <Aviso>Ese negocio no existe.</Aviso>
  return (
    <div className="grid items-start gap-4 md:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
      <ListaNegocios activo={id} marca={marca} onRapida={() => setRapida(true)} />
      <section className="min-w-0">
        {rapida
          ? <TiendaRapidaPanel onCerrar={() => setRapida(false)} />
          : id
          ? <FichaTienda id={id} alCambiar={() => setMarca((valor) => valor + 1)} />
          : (
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-[14px] border border-hc-n-200 bg-white p-4">
                <h2 className="font-display text-[17px] font-bold">Ficha</h2>
                <p className="mt-2 text-sm text-hc-n-600">Elegí una tienda de la lista. Acá se abre el plan, el stock, los pedidos y la sanción.</p>
              </article>
              <article className="rounded-[14px] border border-hc-n-200 bg-white p-4">
                <h2 className="font-display text-[17px] font-bold">Qué se mira</h2>
                <p className="mt-2 text-sm text-hc-n-600">Productos con stock, último pedido y si la membresía está al día.</p>
              </article>
              <article className="rounded-[14px] border border-hc-n-200 bg-white p-4 sm:col-span-2">
                <h2 className="font-display text-[17px] font-bold">Historial</h2>
                <p className="mt-2 text-sm text-hc-n-600">El cambio de nombre, de precio y de stock queda con la hora, para saber si lo hizo el vendedor o vos.</p>
              </article>
            </div>
          )}
      </section>
    </div>
  )
}

function ListaNegocios({ activo, marca, onRapida }: { activo?: string; marca: number; onRapida: () => void }) {
  const [params] = useSearchParams()
  const [filtro, setFiltro] = useState('todos')
  const [filtroDestacado, setFiltroDestacado] = useState('todos')
  const consulta = params.get('q') ?? ''
  // Base fiscal: negocios con inscripción por verificar (solo ADMIN); los que Hacienda confirmó van primero.
  const esAdmin = useAuthStore((s) => s.userRole) === 'ADMIN'
  const [soloFiscal, setSoloFiscal] = useState(false)
  const [fiscalPend, setFiscalPend] = useState<Map<string, string | null>>(new Map())
  const { filas, estado, mensaje, recargar } = useCola('negocios', () => adminService.getEmpresas())
  useEffect(() => {
    if (marca === 0) return
    recargar({ silencio: true })
  }, [marca, recargar])
  useEffect(() => {
    if (!esAdmin) return
    fiscalService.pendientes()
      .then(({ data }) => {
        const lista = Array.isArray(data) ? data : Array.isArray((data as { data?: unknown })?.data) ? (data as { data: unknown[] }).data : []
        const mapa = new Map<string, string | null>()
        for (const f of lista as Array<Record<string, unknown>>) mapa.set(String(f.empresaId), typeof f.verifAuto === 'string' ? f.verifAuto : null)
        setFiscalPend(mapa)
      })
      .catch((err: unknown) => console.error(err))
  }, [esAdmin, marca])
  const porEstado = useMemo(() => filtrarNegocios(filas, filtro, consulta), [filas, filtro, consulta])
  const conteo = useMemo(() => contarDestacados(porEstado), [porEstado])
  const visibles = useMemo(() => {
    const base = filtrarPorDestacado(porEstado, filtroDestacado)
    if (!soloFiscal) return base
    const orden = (f: Fila) => (fiscalPend.get(idSeguro(f) ?? '') === 'COINCIDE' ? 0 : 1)
    return base.filter((f) => fiscalPend.has(idSeguro(f) ?? '')).sort((a, b) => orden(a) - orden(b))
  }, [porEstado, filtroDestacado, soloFiscal, fiscalPend])

  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Tiendas" detalle="Plan, estado y catálogo. La ficha se abre al lado." />
      <button type="button" className={BOTON_PRIMARIO} onClick={onRapida}>Crear tienda rápida</button>
      <Segmento opciones={FILTROS} valor={filtro} onChange={setFiltro} />
      <div role="group" aria-label="Filtrar por destacado" className="flex flex-wrap gap-2">
        {([['todos', 'Todos'], ['destacados', 'Destacados'], ['sin-destacar', 'Sin destacar']] as const).map(([valor, etiqueta]) => (
          <button key={valor} type="button" aria-pressed={filtroDestacado === valor} onClick={() => setFiltroDestacado(valor)}
            className={`inline-flex min-h-11 items-center rounded-full border px-3 text-[13px] font-semibold ${filtroDestacado === valor ? 'border-hc-blue-600 bg-hc-blue-600 text-white' : 'border-hc-n-200 bg-hc-surface text-hc-n-900'}`}>
            {etiqueta} · {conteo[valor]}
          </button>
        ))}
      </div>
      {esAdmin && (
        <button type="button" aria-pressed={soloFiscal} onClick={() => setSoloFiscal((v) => !v)}
          className={`inline-flex min-h-11 items-center self-start rounded-full border px-3 text-[13px] font-semibold ${soloFiscal ? 'border-hc-blue-600 bg-hc-blue-600 text-white' : 'border-hc-n-200 bg-hc-surface text-hc-n-900'}`}>
          Fiscal por verificar · {fiscalPend.size}
        </button>
      )}
      {estado === 'carga' && <Carga />}
      {estado === 'error' && <Aviso>{mensaje}</Aviso>}
      {estado === 'listo' && visibles.length === 0 && <Aviso>Nada en este filtro.</Aviso>}
      <ul className="flex flex-col gap-2">
        {visibles.map((fila) => {
          const negocioId = idSeguro(fila)
          if (!negocioId) return null
          const elegido = negocioId === activo
          return (
            <li key={negocioId}>
              <Link to={`/plataforma/negocios/${negocioId}`} className={`${TARJETA} flex items-center gap-3 border-l-4 ${elegido ? 'border-l-hc-blue-600' : 'border-l-transparent'}`}>
                <MarcoIcono id="negocios" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[17px] font-bold leading-6 text-hc-n-900">{texto(fila.nombreComercial, texto(fila.nombreEmpresa, 'Negocio'))}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Chip tono="azul">{texto(fila.plan, texto(fila.planSaas, 'Sin plan'))}</Chip>
                    <Chip tono={texto(fila.estadoEmpresa).toUpperCase() === 'ACTIVO' ? 'ok' : 'alerta'}>{etiquetaEstado(texto(fila.estadoEmpresa, '—'))}</Chip>
                    <Chip>{fila.visibilidadPublica === true ? 'Catálogo visible' : 'Catálogo oculto'}</Chip>
                    {fiscalPend.has(negocioId) && <Chip tono={fiscalPend.get(negocioId) === 'COINCIDE' ? 'ok' : 'alerta'}>{fiscalPend.get(negocioId) === 'COINCIDE' ? 'Fiscal: coincide' : 'Fiscal por verificar'}</Chip>}
                    {fila.destacado === true && <Chip tono="azul">{ETIQUETA_DESTACADO}</Chip>}
                    {fila.destacado === true && textoOrden(fila) && <Chip>{`Orden ${textoOrden(fila)}`}</Chip>}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function etiquetaEstado(estado: string): string {
  return estado.toUpperCase() === 'TEMPORAL' ? 'Temporal' : estado
}
