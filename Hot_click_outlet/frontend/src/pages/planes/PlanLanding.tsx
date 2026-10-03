import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const nombre = t(`planes.${plan}.nombre`)

  return (
    <div className="bg-hc-n-50 font-[family-name:var(--hc-font-text)] text-hc-n-900" data-testid={`landing-${plan}`}>
      {/* Hero */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-6 px-4 pb-8 pt-6 lg:grid-cols-[1fr_480px] lg:gap-12 lg:px-6 lg:pb-14 lg:pt-12">
        <div className="flex flex-col gap-4">
          <SegmentoPlanes actual={plan} />
          <h1 className="font-[family-name:var(--hc-font-display)] text-[30px] font-extrabold leading-[36px] lg:text-[44px] lg:leading-[52px]">
            {t('planes.landing.planLabel')} <span className="text-hc-red-600">{nombre}</span>
          </h1>
          <p className="text-[16px] leading-[24px] text-hc-n-600 lg:text-[18px] lg:leading-[28px]">{t(`planes.${plan}.pitch`)}</p>
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-hc-n-600">
            {t(`planes.${plan}.punto.montos`).replace('[PENDIENTE]', '').trim()} <Pendiente />
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Link to={registro} className="inline-flex h-12 items-center justify-center rounded-[12px] bg-hc-red-500 px-6 text-[15px] font-semibold text-white no-underline hover:bg-hc-red-600">
              {t(`planes.${plan}.cta`)}
            </Link>
            <a href="#comparar-planes" className="inline-flex h-12 items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-6 text-[15px] font-semibold text-hc-n-900 no-underline hover:bg-hc-n-50">
              {t('planes.titulo')}
            </a>
          </div>
          <p className="text-[12px] text-hc-n-600">{t('planes.nota.cambio')} {t('planes.nota.montos')}</p>
        </div>
        <img src={foto.src} alt={foto.alt} className="aspect-[4/3] w-full rounded-[16px] border border-hc-n-200 object-cover" loading="eager" />
      </section>

      {/* Qué incluye */}
      <section className="mx-auto max-w-[1200px] px-4 pb-8 lg:px-6 lg:pb-12">
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
            { n: 1, k: 'registroVendedor.paso1.titulo' },
            { n: 2, k: 'registroVendedor.paso2.titulo' },
            { n: 3, k: 'registroVendedor.paso3.titulo' },
          ].map((p) => (
            <li key={p.n} className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-[14px] font-bold text-hc-blue-600">{p.n}</span>
              <span className="text-[15px] font-semibold">{t(p.k)}</span>
            </li>
          ))}
          <li className="text-[13px] text-hc-n-600">{t('registroVendedor.revision.texto')}</li>
        </ol>
        <video
          className="aspect-video w-full rounded-[16px] border border-hc-n-200 bg-hc-n-100 object-cover"
          src="/emprende/recorrido.mp4"
          controls
          preload="none"
          poster={foto.src}
          aria-label={nombre}
        />
      </section>

      {/* Comparativa */}
      <section id="comparar-planes" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pb-8 lg:px-6 lg:pb-12">
        <h2 className="font-[family-name:var(--hc-font-display)] text-[20px] font-bold lg:text-[24px]">{t('planes.titulo')}</h2>
        <div className="mt-3 overflow-x-auto rounded-[14px] border border-hc-n-200 bg-hc-n-0">
          <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-hc-n-200">
                <th scope="col" className="p-3 font-semibold text-hc-n-600"><span className="sr-only">{t('planes.titulo')}</span></th>
                {PLANES_ORDEN.map((p) => (
                  <th key={p} scope="col" className={`p-3 text-[14px] font-bold ${p === plan ? 'bg-hc-blue-50 text-hc-blue-600' : 'text-hc-n-900'}`}>
                    {t(`planes.${p}.nombre`)}
                    {p === plan ? <span className="block text-[11px] font-semibold text-hc-blue-600">{t('planes.badge.provisorio')}</span> : null}
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
            <p className="text-[14px] text-hc-n-600">{t(`planes.${plan}.pitch`)}</p>
          </div>
          <Link to={registro} className="inline-flex h-12 items-center justify-center rounded-[12px] bg-hc-red-500 px-6 text-[15px] font-semibold text-white no-underline hover:bg-hc-red-600">
            {t(`planes.${plan}.cta`)}
          </Link>
        </div>
      </section>
    </div>
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
