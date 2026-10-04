import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import directorioAtras from '@/assets/figma/tienda/directorio-atras.svg'
import MainLayout from '@/layouts/MainLayout'
import { productService } from '@/services/productService'
import type { Producto } from '@/types/producto'
import { normalizarBusqueda } from '@/pages/catalogo/catalogoFiltros'
import { negocioService, type PlanPublico } from '@/services/negocioService'
import { PLANES_DIRECTORIO, normalizarListaNegocios, planDesdeParam, type AliasPlan } from '@/components/comprador/negocios/negociosPublicos'
import EmprendimientosVacio from './emprendimientos/EmprendimientosVacio'
import BuscarNegocio from './emprendimientos/BuscarNegocio'
import NegocioCard from './emprendimientos/NegocioCard'
import { categoriasDirectorio, negociosDesdeProductos, type NegocioDirectorio } from './emprendimientos/directorioHelpers'

const TAM_PAGINA = 100
const MAX_PAGINAS = 10

function coincide(negocio: NegocioDirectorio, termino: string) {
  const t = normalizarBusqueda(termino)
  if (!t) return true
  return [negocio.nombre, negocio.rubro, negocio.ciudad].some((v) => normalizarBusqueda(v).includes(t))
}

/** Todos los productos públicos, página por página (el directorio se arma con ellos: no hay listado público de tiendas). */
async function productosPublicos(): Promise<Producto[]> {
  const todos: Producto[] = []
  for (let page = 0; page < MAX_PAGINAS; page++) {
    const { data } = await productService.getAll(page, TAM_PAGINA)
    const contenido = (Array.isArray(data) ? data : data?.content ?? []) as Producto[]
    todos.push(...contenido)
    const totalPages = Array.isArray(data) ? 1 : Number((data as { totalPages?: number } | undefined)?.totalPages ?? 1)
    if (page + 1 >= totalPages || contenido.length === 0) break
  }
  return todos
}

/**
 * Directorio de emprendimientos (Figma `29:1159`, móvil): barra propia con atrás y título (sin barra inferior), descripción,
 * buscador y lista de negocios. No hay frame de escritorio: es la misma columna, centrada.
 */
export default function EmprendimientosPage() {
  const { t } = useTranslation()
  const [lista, setLista] = useState<NegocioDirectorio[]>([])
  const [categoria, setCategoria] = useState('')
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const navigate = useNavigate()
  const volver = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))
  const [params, setParams] = useSearchParams()
  const planActivo = planDesdeParam(params.get('plan'))
  // Plan público de cada negocio (slug → plan), resuelto y filtrado en el backend; null = todavía no llegó o falló.
  const [planes, setPlanes] = useState<Map<string, PlanPublico> | null>(null)

  useEffect(() => {
    productosPublicos()
      .then((productos) => setLista(negociosDesdeProductos(productos)))
      .catch((err: unknown) => { console.error('[EmprendimientosPage] negocios', err) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const control = new AbortController()
    negocioService.buscar({ plan: planActivo?.alias, limite: 200 }, control.signal)
      .then(({ data }) => setPlanes(new Map(normalizarListaNegocios(data).map((n) => [n.slug, n.plan]))))
      .catch(() => { if (!control.signal.aborted) setPlanes(null) })
    return () => control.abort()
  }, [planActivo?.alias])

  const elegirPlan = (alias: AliasPlan | null) => {
    const siguiente = new URLSearchParams(params)
    if (alias) siguiente.set('plan', alias)
    else siguiente.delete('plan')
    setParams(siguiente, { replace: true })
    setCategoria('')
  }

  // Con plan elegido solo quedan los negocios que el backend devolvió para ese plan.
  const delPlan = useMemo(
    () => (planActivo ? lista.filter((n) => planes?.has(n.slug)) : lista),
    [lista, planActivo, planes],
  )
  const categorias = useMemo(() => categoriasDirectorio(delPlan), [delPlan])
  const filtrada = useMemo(
    () => delPlan.filter((n) => coincide(n, busqueda) && (!categoria || n.categoria === categoria)),
    [delPlan, busqueda, categoria],
  )
  const titulo = planActivo ? t(planActivo.titulo) : t('emprendimientos.titulo')

  return (
    <MainLayout variante="propia" barraInferior={false}>
      <div className="min-h-[60vh] bg-hc-n-50">
        <div className="border-b border-hc-n-200 bg-hc-n-0">
          <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-4 py-[14px] lg:max-w-none lg:px-8 xl:px-[max(120px,calc((100%_-_1200px)/2))] lg:py-6">
            <div className="flex items-center gap-3">
              <button type="button" onClick={volver} aria-label={t('common.back')} className="relative flex size-[22px] shrink-0 items-center justify-center text-hc-n-900 after:absolute after:-inset-2 after:content-[''] lg:hidden">
                <IconoFigma src={directorioAtras} size={22} />
              </button>
              <h1 className="font-display text-lg font-bold leading-[23px] text-hc-n-900 lg:text-2xl lg:leading-[normal]">{titulo}</h1>
            </div>
            <p className="text-[13px] leading-[18px] text-hc-n-600 lg:text-sm">
              {t('emprendimientos.intro')}
            </p>
            {lista.length > 0 && <BuscarNegocio value={busqueda} onChange={setBusqueda} />}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label={t('negocios.filtrarPlan')}>
              {[null, ...PLANES_DIRECTORIO].map((p) => {
                const activo = (planActivo?.alias ?? null) === (p?.alias ?? null)
                return (
                  <button
                    key={p?.alias ?? 'todos'}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => elegirPlan(p?.alias ?? null)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-[14px] py-2 text-[13px] font-medium leading-[normal] ${
                      activo ? 'border-hc-blue-600 bg-hc-blue-600 text-white' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'
                    }`}
                  >
                    {p ? t(p.nav) : t('negocios.todos')}
                  </button>
                )
              })}
              {categorias.length > 1 && categorias.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={categoria === c}
                  onClick={() => setCategoria(categoria === c ? '' : c)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-[14px] py-2 text-[13px] font-medium leading-[normal] ${
                    categoria === c ? 'border-hc-blue-600 bg-hc-blue-600 text-white' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-[720px] flex-col gap-[14px] px-4 pb-7 pt-4 lg:max-w-none lg:px-8 xl:px-[max(120px,calc((100%_-_1200px)/2))] lg:pb-12 lg:pt-6">
          {loading && (
            <div role="status" className="py-20 text-center text-sm text-hc-n-600">
              <div className="mx-auto mb-4 size-9 animate-spin rounded-full border-[3px] border-hc-n-200 border-t-hc-blue-600" />
              {t('common.loading')}
            </div>
          )}
          {!loading && lista.length === 0 && <EmprendimientosVacio />}
          {!loading && lista.length > 0 && (
            <>
              <p className="text-[13px] font-semibold leading-[normal] text-hc-n-600">
                {t('emprendimientos.negocios', { count: filtrada.length })}
              </p>
              {filtrada.length === 0 ? (
                <p className="py-16 text-center text-sm text-hc-n-600">
                  {busqueda.trim()
                    ? t('emprendimientos.sinCoincidencias', { busqueda })
                    : t('negocios.sinPlan', { plan: planActivo ? t(planActivo.titulo) : '' })}
                </p>
              ) : (
                <div className="grid gap-[14px] lg:grid-cols-2 xl:grid-cols-3">
                  {filtrada.map((negocio, indice) => (
                    <NegocioCard key={negocio.slug} negocio={negocio} indice={indice} plan={planes?.get(negocio.slug)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
