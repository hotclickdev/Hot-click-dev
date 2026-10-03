import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Seo from '@/components/seo/Seo'
import PaginaInformativa, { BloqueInformativo } from '@/components/comprador/PaginaInformativa'
import PreguntaFrecuente from '@/components/comprador/PreguntaFrecuente'
import { Etiqueta, NotaInfo, PasosNumerados, Puntos, Tarjeta } from './informacion/PiezasInformacion'

const HREF_WA_CONSULTA = 'https://wa.me/50686667888'
const PREGUNTAS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

/**
 * Información (cómo comprar, condiciones, envíos, garantía y preguntas) con la plantilla de Figma `28:1660`
 * (derivado de Figma: no tiene frame propio). Reemplaza las secciones oscuras con animación de antes.
 */
export default function InformacionPage() {
  const { t } = useTranslation()
  const k = (c: string) => t(`informacion.${c}`)

  const pasos = [1, 2, 3, 4, 5, 6].map((n) => ({ titulo: k(`step${n}Title`), detalle: k(`step${n}Desc`) }))
  const condiciones = [1, 2, 3].map((n) => ({
    etiqueta: k(`cond${n}Label`), detalle: k(`cond${n}Desc`), puntos: [1, 2, 3].map((p) => k(`cond${n}p${p}`)),
  }))
  const pasosDevolucion = [1, 2, 3].map((n) => ({ titulo: k(`returnStep${n}Title`), detalle: k(`returnStep${n}Desc`) }))

  return (
    <PaginaInformativa
      titulo={k('title')}
      encabezado={k('hero')}
      subtitulo={k('heroSub')}
      indiceEnFila
      indice={[
        { id: 'como-comprar', texto: k('howToBuy') },
        { id: 'condiciones', texto: k('conditionsTitle') },
        { id: 'envios', texto: k('shippingTitle') },
        { id: 'garantia', texto: k('warranty') },
        { id: 'preguntas', texto: k('faqTitle') },
      ]}
    >
      <Seo
        title="Cómo comprar, envíos y garantía — HotClick"
        description="Guía de compra en HotClick: envíos en Costa Rica, garantía de producto hasta 40 días por defectos y derecho de retracto de 7 días hábiles (Ley 7472)."
        url="https://hotclick.lat/informacion"
      />
      <div className="flex flex-col bg-hc-n-50 pb-8 lg:bg-transparent">
        <BloqueInformativo id="como-comprar" titulo={k('howToBuy')}>
          <p className="text-[14px] leading-5 text-hc-n-600">{k('howToBuySub')}</p>
          <PasosNumerados pasos={pasos} />
        </BloqueInformativo>

        <BloqueInformativo id="condiciones" titulo={k('conditionsTitle')}>
          <p className="text-[14px] leading-5 text-hc-n-600">{k('conditionsSub')}</p>
          {condiciones.map((c) => (
            <Tarjeta key={c.etiqueta}>
              <Etiqueta>{c.etiqueta}</Etiqueta>
              <p className="text-[14px] leading-5 text-hc-n-900">{c.detalle}</p>
              <Puntos items={c.puntos} />
            </Tarjeta>
          ))}
        </BloqueInformativo>

        <BloqueInformativo id="envios" titulo={k('shippingTitle')}>
          <p className="text-[14px] leading-5 text-hc-n-600">{k('shippingSectionSub')}</p>
          <Tarjeta>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold text-hc-n-900">{k('shippingCorreosTitle')}</span>
              <Etiqueta>{k('shippingCorreosBadge')}</Etiqueta>
            </div>
            <Puntos items={[1, 2, 3, 4].map((n) => k(`correosP${n}`))} />
          </Tarjeta>
          <Tarjeta>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-semibold text-hc-n-900">{k('shippingUberTitle')}</span>
              <Etiqueta>{k('shippingUberBadge')}</Etiqueta>
            </div>
            <Puntos items={[1, 2, 3, 4].map((n) => k(`uberP${n}`))} />
          </Tarjeta>
          <NotaInfo>{k('uberNote')}</NotaInfo>
          <Tarjeta>
            <span className="text-[14px] font-semibold text-hc-n-900">{k('reserveTitle')}</span>
            <p className="text-[13px] leading-[18px] text-hc-n-600">{k('reserveDesc')}</p>
            <Puntos items={[k('reservePoint1'), k('reservePoint2')]} />
          </Tarjeta>
        </BloqueInformativo>

        <BloqueInformativo id="garantia" titulo={k('warrantyTitle')}>
          <p className="text-[14px] leading-5 text-hc-n-600">{k('warrantySub')}</p>
          <Tarjeta className="flex-row items-center gap-3">
            <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-[12px] bg-hc-green-50 text-hc-green-600">
              <span className="font-display text-[20px] font-extrabold leading-none">40</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em]">{k('days')}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="text-[14px] font-semibold text-hc-n-900">{k('warrantyBannerTitle')}</span>
              <span className="text-[12px] leading-[17px] text-hc-n-600">{k('warrantyBannerDesc')}</span>
            </span>
          </Tarjeta>
          <PasosNumerados pasos={pasosDevolucion} />
          <NotaInfo>{k('warrantyNote')}</NotaInfo>
        </BloqueInformativo>

        <BloqueInformativo id="preguntas" titulo={k('faqTitle')}>
          {PREGUNTAS.map((n, i) => (
            <PreguntaFrecuente key={n} pregunta={k(`faq${n}q`)} abiertaInicial={i === 0}>{k(`faq${n}a`)}</PreguntaFrecuente>
          ))}
        </BloqueInformativo>

        <section className="px-4 pt-[18px] lg:px-0">
          <Tarjeta className="gap-3">
            <span className="font-display text-[17px] font-bold text-hc-n-900">{k('ctaTitle')}</span>
            <p className="text-[14px] leading-5 text-hc-n-600">{k('ctaSub')}</p>
            <Link to="/productos" className="flex items-center justify-center rounded-[12px] bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0">
              {k('ctaBtn')}
            </Link>
            <a href={HREF_WA_CONSULTA} target="_blank" rel="noopener noreferrer" aria-label={k('ctaWaAria')}
              className="flex items-center justify-center rounded-[12px] border border-hc-n-200 px-4 py-[12px] text-[14px] font-semibold text-hc-n-600">
              {k('ctaWa')}
            </a>
          </Tarjeta>
        </section>
      </div>
    </PaginaInformativa>
  )
}
