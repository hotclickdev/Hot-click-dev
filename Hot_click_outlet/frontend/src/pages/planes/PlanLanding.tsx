import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BuildingStorefrontIcon, ComputerDesktopIcon, CubeIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { WHATSAPP_HOTCLICK } from '@/components/ui/flotantes/flotantesHelpers'
import { COMPARATIVA, FAQ_IDS, FOTO_HERO, PLANES_ORDEN, PUNTOS, QUERY_REGISTRO, RUTA_LANDING, type PlanLandingId } from './planLandingDatos'

/**
 * Landing de plan sobre el manual de Figma (Home 9:171 para el hero y el CTA "Vendé en HotClick", tarjetas
 * claras de `ficha-video.png`, chips pill b100/b600, control segmentado n100). Reemplaza las landings viejas
 * (hero degradado/marino, azul #005cb2, cupos gratis, montos sin confirmar y promesas que no existen).
 */
export default function PlanLanding({ plan }: { plan: PlanLandingId }) {
  const { t } = useTranslation()
  const registro = `/registro-empresa?plan=${QUERY_REGISTRO[plan]}`
  const foto = FOTO_HERO[plan]
  const poster = plan === 'emprendedor' ? FOTO_HERO.pyme.src : FOTO_HERO.emprendedor.src
  const nombre = t(`planes.${plan}.nombre`)
  const heroCta = useRef<HTMLAnchorElement>(null)
  const [heroVisible, setHeroVisible] = useState(true)

  useEffect(() => {
    const nodo = heroCta.current
    if (!nodo) return undefined
    const obs = new IntersectionObserver(([entrada]) => setHeroVisible(entrada.isIntersecting), { threshold: 0.5 })
    obs.observe(nodo)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="bg-hc-n-50 pb-24 font-[family-name:var(--hc-font-text)] text-hc-n-900 md:pb-0" data-testid={`landing-${plan}`}>
      {/* Hero */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-6 px-4 pb-8 pt-6 lg:grid-cols-[1fr_480px] lg:gap-12 lg:px-6 lg:pb-14 lg:pt-12">
        <div className="flex flex-col gap-4">
          <div className="max-md:hidden"><SegmentoPlanes actual={plan} /></div>
          <h1 className="font-[family-name:var(--hc-font-display)] text-[30px] font-extrabold leading-[36px] lg:text-[44px] lg:leading-[52px]">
            {t('planes.landing.planLabel')} <span className="text-hc-red-600">{nombre}</span>
          </h1>
          <p className="text-[16px] leading-[24px] text-hc-n-600 lg:text-[18px] lg:leading-[28px]">{t(`planes.${plan}.pitch`)}</p>
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-hc-n-600">
            {t(`planes.${plan}.punto.montos`).replace('[PENDIENTE]', '').trim()} <Pendiente />
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Link ref={heroCta} to={registro} className="inline-flex h-12 items-center justify-center rounded-[12px] bg-hc-red-500 px-6 text-[15px] font-semibold text-white no-underline hover:bg-hc-red-600">
              {t(`planes.${plan}.cta`)}
            </Link>
            <a href="#comparar-planes" className="inline-flex h-12 items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-6 text-[15px] font-semibold text-hc-n-900 no-underline hover:bg-hc-n-50">
              {t('planes.titulo')}
            </a>
          </div>
          <p className="text-[12px] text-hc-n-600">{t('planes.nota.cambio')} {t('planes.nota.montos')}</p>
        </div>
        <img src={foto.src} alt={foto.alt} className="aspect-[4/3] max-h-[200px] w-full rounded-[16px] border border-hc-n-200 object-cover md:max-h-none" loading="eager" />
      </section>

      {/* Qué incluye: en celular lo repite la tarjeta de plan, así que solo se ve en escritorio. */}
      <section className="mx-auto hidden max-w-[1200px] px-4 pb-8 md:block lg:px-6 lg:pb-12">
        <div className="rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4 lg:p-6">
          <h2 className="font-[family-name:var(--hc-font-display)] text-[20px] font-bold lg:text-[24px]">{t('planes.subtitulo')}</h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {PUNTOS[plan].map((k) => (
              <li key={k} className="flex items-start gap-2.5 rounded-[14px] border border-hc-n-200 p-3 text-[14px] font-semibold leading-5">
                <Check />{t(`planes.${plan}.punto.${k}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Cómo funciona: 3 pasos + video local */}
      <section className="mx-auto grid max-w-[1200px] gap-4 px-4 pb-8 lg:grid-cols-2 lg:px-6 lg:pb-12">
        <ol className="flex flex-col gap-2.5">
          {[
            { n: 1, texto: 'Elegí tu plan y creá la cuenta' },
            { n: 2, texto: 'Subí tus productos con foto' },
            { n: 3, texto: 'Recibí el pedido y cobrá' },
          ].map((p) => (
            <li key={p.n} className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-[14px] font-bold text-hc-blue-600">{p.n}</span>
              {/* TODO copy Producto */}
              <span className="text-[15px] font-semibold">{p.texto}</span>
            </li>
          ))}
          <li className="text-[13px] text-hc-n-600">{t('registroVendedor.revision.texto')}</li>
        </ol>
        <video
          className="aspect-video w-full rounded-[16px] border border-hc-n-200 bg-hc-n-100 object-cover"
          src="/emprende/recorrido.mp4"
          controls
          preload="none"
          poster={poster}
          aria-label={nombre}
        />
      </section>

      {/* Comparativa */}
      <section id="comparar-planes" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pb-8 lg:px-6 lg:pb-12">
        <h2 className="font-[family-name:var(--hc-font-display)] text-[20px] font-bold lg:text-[24px]">{t('planes.titulo')}</h2>
        {/* Celular: selector de plan y una sola tarjeta con todas las filas (sin tabla cortada). */}
        <ComparativaMovil plan={plan} />
        {/* Escritorio: la tabla de siempre. relative: los sr-only (position:absolute) de las celdas no escapan del scroll. */}
        <div className="relative mt-3 hidden overflow-x-auto rounded-[14px] border border-hc-n-200 bg-hc-n-0 sm:block" data-testid="comparativa-tabla">
          <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-hc-n-200">
                <th scope="col" className="p-3 font-semibold text-hc-n-600"><span className="sr-only">{t('planes.titulo')}</span></th>
                {PLANES_ORDEN.map((p) => (
                  <th key={p} scope="col" className={`p-3 text-[14px] font-bold ${p === plan ? 'bg-hc-blue-50 text-hc-blue-600' : 'text-hc-n-900'}`}>
                    {t(`planes.${p}.nombre`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARATIVA.map(({ fila, valores }) => (
                <tr key={fila} className="border-b border-hc-n-200 last:border-b-0">
                  <th scope="row" className="p-3 font-medium text-hc-n-900">{t(`planes.comparativa.${fila}`)}</th>
                  {valores.map((v, i) => (
                    <td key={PLANES_ORDEN[i]} className={`p-3 ${PLANES_ORDEN[i] === plan ? 'bg-hc-blue-50' : ''}`}><CeldaValor v={v} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1200px] px-4 pb-8 lg:px-6 lg:pb-12">
        <h2 className="font-[family-name:var(--hc-font-display)] text-[20px] font-bold lg:text-[24px]">{t('planes.landing.faqTitulo')}</h2>
        <div className="mt-3 flex flex-col gap-2">
          {FAQ_IDS.map((id) => (
            <details key={id} className="group rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-3.5">
              <summary className="cursor-pointer list-none text-[15px] font-semibold marker:hidden">{t(`planes.faq.${id}.q`)}</summary>
              <p className="mt-2 text-[14px] leading-[21px] text-hc-n-600">{t(`planes.faq.${id}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section className="mx-auto max-w-[1200px] px-4 pb-12 lg:px-6 lg:pb-16">
        <div className="flex flex-col items-start gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div>
            <p className="font-[family-name:var(--hc-font-display)] text-[20px] font-bold">{t('registroVendedor.paso1.titulo')}</p>
            <p className="text-[14px] text-hc-n-600 md:hidden">{t('planes.nota.montos')}</p>
            <p className="hidden text-[14px] text-hc-n-600 md:block">{t(`planes.${plan}.pitch`)}</p>
          </div>
          <Link to={registro} className="inline-flex h-12 items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-6 text-[15px] font-semibold text-hc-n-900 no-underline hover:bg-hc-n-50 md:border-0 md:bg-hc-red-500 md:text-white md:hover:bg-hc-red-600">
            {t(`planes.${plan}.cta`)}
          </Link>
        </div>
        {/* En celular el botón flotante de WhatsApp no se muestra aquí (tapaba la foto y la barra): va en su lugar. */}
        <div className="mt-3 flex flex-col items-start gap-2 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4 lg:hidden" data-testid="landing-whatsapp">
          <p className="text-[14px] text-hc-n-600">{t('planes.landing.whatsapp.texto')}</p>
          <a
            href={`https://wa.me/${WHATSAPP_HOTCLICK}?text=${encodeURIComponent(t('planes.landing.whatsapp.saludo'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 text-[15px] font-semibold text-hc-n-900 no-underline"
          >
            {t('planes.landing.whatsapp.boton')}
          </a>
        </div>
      </section>
      {heroVisible ? null : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hc-n-200 bg-hc-n-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          <Link to={registro} className="flex h-12 items-center justify-center rounded-[12px] bg-hc-red-500 text-[15px] font-semibold text-white no-underline">
            {t('planes.landing.empezarCon', { plan: nombre })}
          </Link>
        </div>
      )}
    </div>
  )
}

/**
 * Comparativa en celular (< 640 px), pedido de HOT_CLICK (3-oct-2026): chips segmentados Emprendedor / Pyme /
 * Negocio Plus y una tarjeta por plan. Cabecera con el nombre en Sora, para quién es y los montos en [PENDIENTE];
 * los 4 límites en una grilla 2 × 2 con íconos; lo incluido con check verde en círculo y lo no incluido atenuado,
 * tachado suave y al final; botón rojo «Empezar con …». Cambia de plan con un fundido corto (sin movimiento si el
 * sistema pide reducirlo). Arranca en el plan de la página.
 */
const NUMEROS = [
  { fila: 'productos', Icono: CubeIcon },
  { fila: 'bodegas', Icono: BuildingStorefrontIcon },
  { fila: 'cajas', Icono: ComputerDesktopIcon },
  { fila: 'usuarios', Icono: UserGroupIcon },
] as const
const FILAS_MONTO = ['mensualidad', 'comision']

function ComparativaMovil({ plan }: { plan: PlanLandingId }) {
  const { t } = useTranslation()
  const reducir = useReducedMotion()
  const [elegido, setElegido] = useState<PlanLandingId>(plan)
  const indice = PLANES_ORDEN.indexOf(elegido)
  const valor = (fila: string) => COMPARATIVA.find((c) => c.fila === fila)?.valores[indice] ?? 'no'
  const funciones = COMPARATIVA.filter(
    (c) => !FILAS_MONTO.includes(c.fila) && !NUMEROS.some((n) => n.fila === c.fila),
  )
  const incluidas = funciones.filter((c) => c.valores[indice] !== 'no')
  const faltan = funciones.filter((c) => c.valores[indice] === 'no')
  const esActual = elegido === plan
  const nombre = t(`planes.${elegido}.nombre`)

  return (
    <div className="mt-3 flex flex-col gap-3 sm:hidden" data-testid="comparativa-movil">
      <div role="group" aria-label={t('planes.titulo')} className="flex w-full rounded-[12px] bg-hc-n-100 p-1">
        {PLANES_ORDEN.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={p === elegido}
            onClick={() => setElegido(p)}
            className={`min-h-[40px] flex-1 rounded-[9px] px-1.5 py-2 text-center text-[14px] font-semibold transition-colors ${p === elegido ? 'bg-hc-n-0 text-hc-blue-600 shadow-[0_1px_3px_rgba(20,23,28,.12)]' : 'text-hc-n-600'}`}
          >
            {t(`planes.${p}.nombre`)}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          key={elegido}
          initial={reducir ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducir ? { opacity: 1 } : { opacity: 0, y: -6 }}
          transition={{ duration: reducir ? 0 : 0.2, ease: 'easeOut' }}
          className="overflow-hidden rounded-[16px] border border-hc-n-200 bg-hc-n-0"
          aria-live="polite"
          data-testid="tarjeta-plan-movil"
        >
          {/* Cabecera: degradado suave del rojo en el plan de la página; azul claro en los otros. */}
          <header
            className="flex flex-col gap-1.5 border-b border-hc-n-200 px-4 pb-4 pt-4"
            style={{
              background: esActual
                ? 'linear-gradient(180deg, var(--hc-red-50) 0%, var(--hc-n-0) 100%)'
                : 'linear-gradient(180deg, var(--hc-blue-50) 0%, var(--hc-n-0) 100%)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-[family-name:var(--hc-font-display)] text-[26px] font-extrabold leading-[32px] ${esActual ? 'text-hc-red-600' : 'text-hc-blue-600'}`}>
                {nombre}
              </h3>
              {esActual ? (
                <span className="mt-1 shrink-0 rounded-full bg-hc-n-0 px-2.5 py-0.5 text-[12px] font-semibold text-hc-red-600 ring-1 ring-[var(--hc-red-100)]">
                  {t('planes.landing.planDeEstaPagina')}
                </span>
              ) : null}
            </div>
            <p className="text-[15px] leading-[22px] text-hc-n-600">{t(`planes.${elegido}.pitch`)}</p>
            <dl className="mt-1.5 grid grid-cols-2 gap-2">
              {FILAS_MONTO.map((fila) => (
                <div key={fila} className="rounded-[12px] bg-hc-n-0 px-3 py-2 ring-1 ring-hc-n-200">
                  <dt className="text-[12px] text-hc-n-600">{t(`planes.comparativa.${fila}`)}</dt>
                  <dd className="mt-0.5 font-[family-name:var(--hc-font-display)] text-[15px] font-bold text-hc-n-900">[PENDIENTE]</dd>
                </div>
              ))}
            </dl>
          </header>

          <dl className="grid grid-cols-2 gap-2 px-4 pt-4">
            {NUMEROS.map(({ fila, Icono }) => {
              const v = valor(fila)
              return (
                <div key={fila} className="flex flex-col gap-1 rounded-[14px] bg-hc-n-50 p-3">
                  <Icono className="size-5 text-hc-blue-600" aria-hidden="true" />
                  <dd className={`font-[family-name:var(--hc-font-display)] font-extrabold leading-tight text-hc-n-900 ${v === 'sinLimite' ? 'text-[18px]' : 'text-[26px]'}`}>
                    {v === 'sinLimite' ? t('planes.comparativa.sinLimite') : v}
                  </dd>
                  <dt className="text-[13px] leading-[18px] text-hc-n-600">{t(`planes.comparativa.${fila}`)}</dt>
                </div>
              )
            })}
          </dl>

          <div className="px-4 pt-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-hc-n-600">{t('planes.landing.incluye')}</p>
            <ul className="mt-2 flex flex-col gap-2">
              {incluidas.map(({ fila, valores }) => (
                <li key={fila} className="flex items-center gap-2.5 text-[15px] leading-[21px] text-hc-n-900">
                  <CheckCirculo />
                  <span>
                    {t(`planes.comparativa.${fila}`)}
                    {valores[indice] === 'sinLimite' ? <span className="text-hc-n-600"> · {t('planes.comparativa.sinLimite')}</span> : null}
                    {/^\d+$/.test(valores[indice]) ? <span className="text-hc-n-600"> · {valores[indice]}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            {faltan.length > 0 ? (
              <>
                <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-hc-n-600">{t('planes.landing.noIncluye')}</p>
                <ul className="mt-2 flex flex-col gap-2" data-testid="no-incluidas">
                  {faltan.map(({ fila }) => (
                    <li key={fila} className="flex items-center gap-2.5 text-[15px] leading-[21px] text-hc-n-600 opacity-70">
                      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-hc-n-100 text-hc-n-600" aria-hidden="true">–</span>
                      <span className="line-through decoration-hc-n-300 decoration-1">{t(`planes.comparativa.${fila}`)}</span>
                      <span className="sr-only">{t('planes.comparativa.noIncluido')}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div className="p-4">
            <Link
              to={`/registro-empresa?plan=${QUERY_REGISTRO[elegido]}`}
              className="flex h-12 w-full items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-6 text-[16px] font-semibold text-hc-n-900 no-underline"
            >
              {t('planes.landing.empezarCon', { plan: nombre })}
            </Link>
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  )
}

function CheckCirculo() {
  return (
    <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-hc-success-bg text-hc-success-text" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  )
}

/** Control segmentado del manual (fondo n100, radio 12, activa blanca con texto b600) para saltar entre planes. */
function SegmentoPlanes({ actual }: { actual: PlanLandingId }) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('planes.titulo')} className="inline-flex w-full max-w-[420px] rounded-[12px] bg-hc-n-100 p-1">
      {PLANES_ORDEN.map((p) => (
        <Link
          key={p}
          to={RUTA_LANDING[p]}
          aria-current={p === actual ? 'page' : undefined}
          className={`flex-1 rounded-[9px] px-2 py-2 text-center text-[13px] font-semibold no-underline ${p === actual ? 'bg-hc-n-0 text-hc-blue-600 shadow-[0_1px_3px_rgba(20,23,28,.12)]' : 'text-hc-n-600'}`}
        >
          {t(`planes.${p}.nombre`)}
        </Link>
      ))}
    </nav>
  )
}

function Pendiente() {
  return <span className="inline-flex rounded-full bg-hc-n-100 px-2 py-0.5 text-[11px] font-semibold text-hc-n-600">[PENDIENTE]</span>
}

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px shrink-0 text-hc-success">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function CeldaValor({ v }: { v: string }) {
  const { t } = useTranslation()
  if (v === 'si') return <span className="inline-flex items-center gap-1 text-hc-success-text"><Check /><span className="sr-only">{t('planes.comparativa.incluido')}</span></span>
  if (v === 'no') return <span className="text-hc-n-600" aria-label={t('planes.comparativa.noIncluido')}>—</span>
  if (v === 'sinLimite') return <span className="font-semibold">{t('planes.comparativa.sinLimite')}</span>
  if (v === 'pendiente') return <Pendiente />
  return <span className="font-semibold">{v}</span>
}
