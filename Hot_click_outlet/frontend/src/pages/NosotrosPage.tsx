import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import PaginaInformativa, { BloqueInformativo } from '@/components/comprador/PaginaInformativa'
import { IcoSrv } from './servicios/IcoSrv'
import type { NombreIconoSrv } from './servicios/iconosServicios'

const SITE_URL = 'https://hotclick.lat'

const aboutPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'Sobre HotClick — Marketplace de emprendedores costarricenses',
  description: 'Conocé la historia, misión y valores de HotClick, el marketplace que conecta emprendedores costarricenses con compradores de todo el país.',
  url: `${SITE_URL}/nosotros`,
  inLanguage: 'es-CR',
  isPartOf: { '@type': 'WebSite', name: 'HotClick', url: SITE_URL },
  author: { '@type': 'Organization', name: 'HotClick', url: SITE_URL },
  about: {
    '@type': 'Organization',
    name: 'HotClick',
    description: 'Marketplace 100% costarricense que apoya el comercio local con tecnología moderna, pagos seguros y envío confiable a todo Costa Rica.',
    foundingDate: '2024',
    url: SITE_URL,
    areaServed: { '@type': 'Country', name: 'Costa Rica' },
    sameAs: [
      'https://www.instagram.com/hotclickcr',
      'https://www.facebook.com/hotclickcr',
      'https://www.tiktok.com/@hotclickcr',
    ],
  },
}

type Fila = { icono: NombreIconoSrv; titulo: string; detalle: string }

/** Lista de filas con ícono, como la tabla de tarifas de Figma `28:1660`. */
function ListaFilas({ filas }: { filas: Fila[] }) {
  return (
    <ul className="m-0 flex list-none flex-col rounded-[16px] border border-hc-n-200 bg-hc-n-0 px-4 py-1">
      {filas.map((f, i) => (
        <li key={f.titulo} className={`flex items-start gap-3 py-3 ${i === 0 ? '' : 'border-t border-hc-n-200'}`}>
          <IcoSrv nombre={f.icono} size={18} className="mt-px" />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-[14px] font-medium text-hc-n-900">{f.titulo}</span>
            <span className="text-[12px] leading-[17px] text-hc-n-600">{f.detalle}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Nosotros con la plantilla informativa de Figma `28:1660` (derivado de Figma: no tiene frame propio).
 * Intro con índice en chips, historia del fundador, valores y envíos en filas, y CTA de contacto.
 */
export default function NosotrosPage() {
  const { t } = useTranslation()

  const valores: Fila[] = [
    { icono: 'inicioEscudo', titulo: t('nosotros.val1Title'), detalle: t('nosotros.val1Desc') },
    { icono: 'inicioBuscar', titulo: t('nosotros.val2Title'), detalle: t('nosotros.val2Desc') },
    { icono: 'inicioEstrella', titulo: t('nosotros.val3Title'), detalle: t('nosotros.val3Desc') },
  ]
  const envios: Fila[] = [
    { icono: 'infoCamion', titulo: t('nosotros.correosCR'), detalle: t('nosotros.correosCRSub') },
    { icono: 'inicioReloj', titulo: t('nosotros.uberFlash'), detalle: t('nosotros.uberFlashSub') },
  ]

  return (
    <PaginaInformativa
      titulo={t('nosotros.title')}
      encabezado={t('nosotros.title')}
      subtitulo={t('nosotros.subtitle')}
      indice={[
        { id: 'historia', texto: t('nosotros.founderLabel') },
        { id: 'valores', texto: t('nosotros.values') },
        { id: 'envios', texto: t('nosotros.shippingTitle') },
      ]}
    >
    <Helmet>
      <title>Sobre nosotros — HotClick Marketplace Costa Rica</title>
      <meta name="description" content="Conocé la historia y misión de HotClick, el marketplace 100% costarricense que conecta emprendedores con compradores de todo el país." />
      <link rel="canonical" href={`${SITE_URL}/nosotros`} />
      <link rel="alternate" hrefLang="es-CR" href={`${SITE_URL}/nosotros`} />
      <link rel="alternate" hrefLang="es"    href={`${SITE_URL}/nosotros`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Sobre nosotros — HotClick Marketplace Costa Rica" />
      <meta property="og:description" content="Conocé la historia y misión de HotClick, el marketplace 100% costarricense." />
      <meta property="og:url" content={`${SITE_URL}/nosotros`} />
      <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
      <meta property="og:locale" content="es_CR" />
      <meta property="og:site_name" content="HotClick" />
      <script type="application/ld+json">{JSON.stringify(aboutPageJsonLd)}</script>
    </Helmet>
      <div className="flex flex-col bg-hc-n-50 pb-8 lg:bg-transparent">
        <BloqueInformativo id="historia" titulo={t('nosotros.founderTitle')}>
          <div className="flex flex-col gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
            <div className="flex items-center gap-3">
              <img src="/fundador.jpg" alt={t('nosotros.founderLabel')} width={56} height={56} loading="lazy" className="size-14 shrink-0 rounded-full object-cover" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-hc-blue-600">{t('nosotros.founderLabel')}</span>
            </div>
            <p className="text-[14px] leading-[21px] text-hc-n-600">
              {t('nosotros.founderBio1')}{' '}
              <strong className="font-semibold text-hc-n-900">{t('nosotros.founderBio1Bold')}</strong>.{' '}
              {t('nosotros.founderBio1End')}
            </p>
            <p className="text-[14px] leading-[21px] text-hc-n-600">
              {t('nosotros.founderBio2')}{' '}
              <strong className="font-semibold text-hc-n-900">{t('nosotros.founderBio2Bold')}</strong>{' '}
              {t('nosotros.founderBio2End')}
            </p>
          </div>
        </BloqueInformativo>

        <BloqueInformativo id="valores" titulo={t('nosotros.values')}>
          <ListaFilas filas={valores} />
        </BloqueInformativo>

        <BloqueInformativo id="envios" titulo={t('nosotros.shippingTitle')}>
          <p className="text-[14px] leading-5 text-hc-n-600">
            {t('nosotros.shippingDesc')} <strong className="font-semibold text-hc-n-900">{t('nosotros.shippingDescBold')}</strong>
            {t('nosotros.shippingDescEnd')}
          </p>
          <ListaFilas filas={envios} />
        </BloqueInformativo>

        <section className="px-4 pt-[18px] lg:px-0">
          <div className="flex flex-col gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
            <p className="text-[14px] leading-5 text-hc-n-600">{t('nosotros.ctaSub')}</p>
            <Link to="/contacto" className="flex items-center justify-center rounded-[12px] bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0">
              {t('nosotros.ctaBtn')}
            </Link>
          </div>
        </section>
      </div>
    </PaginaInformativa>
  )
}
