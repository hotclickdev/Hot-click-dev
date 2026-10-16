import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLongRightIcon, BuildingStorefrontIcon, PauseIcon, PlayIcon } from '@heroicons/react/16/solid'
import { StarIcon } from '@heroicons/react/24/outline'
import {
  REANUDAR_MS, ROTACION_MS, anterior, direccionSwipe, iniciales, siguiente,
  type BloqueCarrusel, type ElementoCarrusel, type Posicion, type TipoBloque,
} from './bannerSlides'

const ICONO: Record<TipoBloque, typeof PauseIcon> = {
  descubri: ArrowLongRightIcon,
  negocio: BuildingStorefrontIcon,
  producto: StarIcon,
}

/** Foco visible (HANDOFF §6): anillo de 2 px b600 + halo. */
const FOCO = 'outline-none focus-visible:ring-2 focus-visible:ring-hc-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-hc-blue-100 dark:focus-visible:ring-[#6EA0FF]'
/** Alto fijo del slide por breakpoint, para que no salte el layout (CLS ≈ 0). */
const ALTO_SLIDE = 'h-[230px] lg:h-[330px]'

function useReduceMotion(): boolean {
  const consulta = '(prefers-reduced-motion: reduce)'
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(consulta).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(consulta)
    if (!mq) return
    const cambio = () => setReduce(mq.matches)
    mq.addEventListener?.('change', cambio)
    return () => mq.removeEventListener?.('change', cambio)
  }, [])
  return reduce
}

/** Placeholder de marca: monograma b600 sobre b50 y el rótulo «SIN FOTO». Nunca un hueco. */
function SinFoto({ nombre, className }: { nombre: string; className: string }) {
  const { t } = useTranslation()
  return (
    <span role="img" aria-label={t('home.carrusel.sinFoto')} className={`flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-[14px] border border-hc-blue-100 bg-hc-blue-50 dark:border-[#30363D] dark:bg-[#0D1117] ${className}`}>
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-hc-n-0 font-display text-[34px] font-extrabold leading-none text-hc-blue-600 dark:bg-[#161B22] dark:text-[#6EA0FF]">
        {iniciales(nombre)}
      </span>
      <span aria-hidden="true" className="text-[10px] font-bold uppercase text-hc-n-600 dark:text-[#9DA7B3]">{t('home.carrusel.sinFotoRotulo')}</span>
    </span>
  )
}

/** Foto del slide; si falta o falla al cargar (`onError`), placeholder de marca. */
function Foto({ src, nombre, lazy }: { src: string | null; nombre: string; lazy: boolean }) {
  const [rota, setRota] = useState<string | null>(null)
  const medida = 'size-[110px] lg:size-[220px]'
  if (!src || rota === src) return <SinFoto nombre={nombre} className={medida} />
  return (
    <img
      src={src}
      alt=""
      loading={lazy ? 'lazy' : undefined}
      onError={() => setRota(src)}
      className={`${medida} shrink-0 rounded-[14px] border border-hc-n-200 bg-hc-n-100 object-cover dark:border-[#30363D]`}
    />
  )
}

/**
 * Descubrí: 2 fotos del catálogo apiladas, solo de ilustración. Sin fotos sanas, ilustración de marca
 * (isotipo sobre b50), nunca el placeholder «SIN FOTO»: Descubrí no es un elemento que «no tenga foto».
 */
function FotosDescubri({ fotos }: { fotos: string[] }) {
  const [rotas, setRotas] = useState<string[]>([])
  const sanas = fotos.filter((f) => !rotas.includes(f))
  const medida = 'size-[110px] lg:size-[220px]'
  if (sanas.length === 0) {
    return (
      <span aria-hidden="true" data-testid="carrusel-ilustracion-marca" className={`flex ${medida} shrink-0 items-center justify-center rounded-[14px] border border-hc-blue-100 bg-hc-blue-50 dark:border-[#30363D] dark:bg-[#0D1117]`}>
        <img src="/brand/hotclick-isotipo.png" alt="" className="w-3/5 object-contain" />
      </span>
    )
  }
  return (
    <span aria-hidden="true" className={`relative ${medida} shrink-0`}>
      {sanas[1] && (
        <img src={sanas[1]} alt="" onError={() => setRotas((r) => [...r, sanas[1]])}
          className="absolute inset-0 size-full rotate-6 rounded-[14px] border border-hc-n-200 bg-hc-n-100 object-cover dark:border-[#30363D]" />
      )}
      <img src={sanas[0]} alt="" onError={() => setRotas((r) => [...r, sanas[0]])}
        className="absolute inset-0 size-full -rotate-3 rounded-[14px] border border-hc-n-200 bg-hc-n-100 object-cover dark:border-[#30363D]" />
    </span>
  )
}

/**
 * Carrusel del inicio (HANDOFF carrusel-inicio, aprobado 16-oct-2026): 3 bloques —Descubrí, Negocio destacado y
 * Producto destacado—, un punto por bloque, barrita «X de N», pausa visible, swipe y teclado.
 * Solo enlaza a /descubri, /tienda/<slug> o /productos/<id>: nunca contacto del emprendedor.
 */
export default function BannerDescubrir({ bloques, cargando = false }: { bloques: BloqueCarrusel[]; cargando?: boolean }) {
  const { t } = useTranslation()
  const reduce = useReduceMotion()
  const [pos, setPos] = useState<Posicion>({ bloque: 0, elemento: 0 })
  const [pausaBoton, setPausaBoton] = useState(false)
  const [hover, setHover] = useState(false)
  const [foco, setFoco] = useState(false)
  const [toque, setToque] = useState(false)
  const [oculta, setOculta] = useState(() => typeof document !== 'undefined' && document.hidden)
  const [manual, setManual] = useState(false)
  const timerToque = useRef<number | undefined>(undefined)
  const inicio = useRef<{ x: number; y: number } | null>(null)

  const nBloques = bloques.length
  const totalElementos = bloques.reduce((n, b) => n + b.elementos.length, 0)
  const conControles = nBloques > 1
  const actual = bloques[pos.bloque] ? pos : { bloque: 0, elemento: 0 }

  useEffect(() => {
    const cambio = () => setOculta(document.hidden)
    document.addEventListener('visibilitychange', cambio)
    return () => document.removeEventListener('visibilitychange', cambio)
  }, [])
  useEffect(() => () => window.clearTimeout(timerToque.current), [])

  const pausado = pausaBoton || hover || foco || toque || oculta
  const rota = conControles && totalElementos > 1 && !reduce && !pausado

  useEffect(() => {
    if (!rota) return
    const id = window.setTimeout(() => {
      setManual(false)
      setPos((p) => siguiente(bloques, bloques[p.bloque] ? p : { bloque: 0, elemento: 0 }))
    }, ROTACION_MS)
    return () => window.clearTimeout(id)
  }, [rota, pos, bloques])

  /** Toque o swipe: pausa y se reanuda sola a los 10 s sin interacción. */
  const pausarPorToque = useCallback(() => {
    setToque(true)
    window.clearTimeout(timerToque.current)
    timerToque.current = window.setTimeout(() => setToque(false), REANUDAR_MS)
  }, [])

  const ir = useCallback((p: Posicion) => { setManual(true); setPos(p) }, [])

  if (cargando) {
    return <div aria-hidden="true" className={`mx-4 rounded-[16px] bg-hc-n-100 dark:bg-[#161B22] lg:mx-0 ${ALTO_SLIDE}`} />
  }
  if (nBloques === 0) return null

  const bloque = bloques[actual.bloque]
  const el: ElementoCarrusel = bloque.elementos[actual.elemento] ?? bloque.elementos[0]
  const n = bloque.elementos.length
  const x = actual.elemento + 1
  const etiqueta = t(`home.carrusel.bloque.${bloque.tipo}.etiqueta`)
  const titulo = bloque.tipo === 'descubri' ? t('home.carrusel.bloque.descubri.titulo') : el.titulo
  const detalle = bloque.tipo === 'descubri' ? t('home.carrusel.bloque.descubri.detalle') : el.detalle
  const cta = t(`home.carrusel.bloque.${bloque.tipo}.cta`)
  const Icono = ICONO[bloque.tipo]
  const tipoCorto = t(`home.carrusel.tipo.${bloque.tipo}`)
  /** Descubrí no lleva contador (un solo slide); Negocio y Producto: «Negocio 1 de 2», «Producto 1 de 3». */
  const esDescubri = bloque.tipo === 'descubri'
  const textoPosicion = esDescubri ? '' : t('home.carrusel.posicion', { tipo: tipoCorto, x, n })
  /** Pausa visible (▶ y «Pausado · x de n»): botón o toque; hover, foco y pestaña oculta pausan sin cambiar el control. */
  const enPausa = pausaBoton || toque
  const lazy = actual.bloque > 0 || actual.elemento > 0
  const slideId = 'hc-carrusel-slide'

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!conControles && totalElementos < 2) return
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(siguiente(bloques, actual)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(anterior(bloques, actual)) }
  }
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    // Puntos y pausa tienen su propia acción: tocarlos no cuenta como toque de pausa ni inicia un swipe.
    if ((e.target as HTMLElement).closest('button')) return
    if (e.pointerType !== 'mouse') pausarPorToque()
    inicio.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const ini = inicio.current
    inicio.current = null
    if (!ini || totalElementos < 2) return
    const dir = direccionSwipe(e.clientX - ini.x, e.clientY - ini.y)
    if (dir === 0) return
    pausarPorToque()
    ir(dir === 1 ? siguiente(bloques, actual) : anterior(bloques, actual))
  }

  return (
    <section
      aria-roledescription={t('home.carrusel.rol')}
      aria-label={t('home.carrusel.region')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFoco(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFoco(false) }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { inicio.current = null }}
      className="mx-4 scroll-mt-[186px] touch-pan-y overflow-hidden rounded-[16px] border border-hc-n-200 bg-hc-n-0 text-hc-n-900 dark:border-[#30363D] dark:bg-[var(--hc-surface,#161B22)] dark:text-[#E6EDF3] lg:mx-0 lg:scroll-mt-[125px]"
    >
      <style>{`
        @keyframes hc-carrusel-entra{from{opacity:0;transform:translateY(6px)}}
        .hc-carrusel-entra{animation:hc-carrusel-entra .3s ease-out}
        @media (prefers-reduced-motion: reduce){.hc-carrusel-entra{animation:none}}
      `}</style>
      <div className={`relative flex flex-col ${ALTO_SLIDE}`}>
        {n > 1 && (
          <div aria-hidden="true" className="mx-5 mt-3 flex gap-1">
            {bloque.elementos.map((e, j) => (
              <span key={e.clave} className={`h-[3px] flex-1 rounded-full ${j === actual.elemento ? 'bg-[var(--hc-n-700)] dark:bg-[#E6EDF3]' : j < actual.elemento ? 'bg-hc-n-400' : 'bg-hc-n-200 dark:bg-[#30363D]'}`} />
            ))}
          </div>
        )}
        <div aria-live={manual ? 'polite' : 'off'} className="flex min-h-0 flex-1">
          <div
            id={slideId}
            key={el.clave}
            role="group"
            aria-roledescription={t('home.carrusel.diapositiva')}
            aria-label={esDescubri ? etiqueta : `${etiqueta}, ${x} de ${n}`}
            className={`flex min-w-0 flex-1 items-center gap-3 p-5 lg:gap-10 lg:px-10 lg:py-8 ${reduce ? '' : 'hc-carrusel-entra'}`}
          >
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[.06em] text-hc-blue-600 dark:text-[#6EA0FF]">
                <Icono aria-hidden="true" className="size-4 shrink-0" />
                {etiqueta}
              </span>
              <h3 className="mt-1 line-clamp-2 font-display text-[20px] font-bold leading-[1.2] lg:text-[28px]">{titulo}</h3>
              {detalle && <p className={`mt-1 w-full text-[14px] text-hc-n-600 dark:text-[#9DA7B3] ${esDescubri ? 'line-clamp-2 leading-[1.5]' : 'truncate'}`}>{detalle}</p>}
              <Link
                to={el.to}
                className={`mt-3 inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full bg-hc-red-500 px-3.5 text-[15px] lg:px-4 font-bold text-hc-n-0 ${FOCO}`}
              >
                {cta} →
              </Link>
            </div>
            {bloque.tipo === 'descubri'
              ? <FotosDescubri fotos={bloque.fotos ?? []} />
              : <Foto key={el.clave} src={el.foto} nombre={el.titulo} lazy={lazy} />}
          </div>
        </div>
      </div>
      {conControles && (
        <div className="flex h-[50px] items-center gap-2 border-t border-hc-n-100 pl-1 pr-1 dark:border-[#30363D]">
          <div role="tablist" aria-label={t('home.carrusel.puntos')} className="flex items-center">
            {bloques.map((b, j) => {
              const sel = j === actual.bloque
              return (
                <button
                  key={b.tipo}
                  type="button"
                  role="tab"
                  aria-selected={sel}
                  aria-controls={slideId}
                  aria-label={t(`home.carrusel.bloque.${b.tipo}.etiqueta`)}
                  tabIndex={0}
                  onClick={() => ir({ bloque: j, elemento: 0 })}
                  className={`flex size-11 items-center justify-center rounded-full ${FOCO}`}
                >
                  <span className={`block h-2 rounded-full ${sel ? 'w-6 bg-hc-blue-600 dark:bg-[#6EA0FF]' : 'w-2 bg-hc-n-300 dark:bg-[#30363D]'}`} />
                </button>
              )
            })}
          </div>
          <p className="min-w-0 flex-1 truncate text-center text-[13px] text-hc-n-600 dark:text-[#9DA7B3]">
            {enPausa ? (esDescubri ? t('home.carrusel.pausadoSolo') : t('home.carrusel.pausado', { tipo: tipoCorto, x, n })) : textoPosicion}
          </p>
          <button
            type="button"
            aria-label={enPausa ? t('home.carrusel.reanudar') : t('home.carrusel.pausar')}
            aria-pressed={enPausa}
            onClick={() => {
              if (enPausa) { setPausaBoton(false); setToque(false); window.clearTimeout(timerToque.current) } else setPausaBoton(true)
            }}
            className={`flex size-11 items-center justify-center rounded-full text-[var(--hc-n-700)] dark:text-[#E6EDF3] ${FOCO}`}
          >
            {enPausa ? <PlayIcon aria-hidden="true" className="size-4" /> : <PauseIcon aria-hidden="true" className="size-4" />}
          </button>
        </div>
      )}
    </section>
  )
}
