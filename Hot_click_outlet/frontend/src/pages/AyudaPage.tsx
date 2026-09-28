import { useTranslation } from 'react-i18next'
import Seo from '@/components/seo/Seo'
import PaginaInformativa from '@/components/comprador/PaginaInformativa'
import ListaAccesos from '@/components/comprador/estados/ListaAccesos'
import {
  AccesoAyuda, AccesoEnvios, AccesoGarantia, AccesoSolicitudes,
} from '@/components/comprador/estados/iconosAcceso'

/**
 * Centro de ayuda del comprador: reúne los puntos de entrada que ya existen
 * en la app (Servicios HOT, garantía/devoluciones, envíos, FAQ y contacto)
 * bajo una sola pantalla, siguiendo el mismo lenguaje visual que
 * `NotFoundPage`/`ProfilePage` (`PaginaInformativa`, `ListaAccesos`).
 *
 * No inventa contenido nuevo: cada tarjeta enlaza a una página que ya existe
 * en el sitio (`/servicios`, `/informacion`, `/envios`, `/contacto`).
 */
export default function AyudaPage() {
  const { t } = useTranslation()

  const accesos = [
    {
      to: '/servicios',
      texto: t('ayudaPage.serviciosTitle'),
      detalle: t('ayudaPage.serviciosDetalle'),
      icono: <AccesoSolicitudes />,
    },
    {
      to: '/informacion',
      texto: t('ayudaPage.garantiaTitle'),
      detalle: t('ayudaPage.garantiaDetalle'),
      icono: <AccesoGarantia />,
    },
    {
      to: '/envios',
      texto: t('ayudaPage.enviosTitle'),
      detalle: t('ayudaPage.enviosDetalle'),
      icono: <AccesoEnvios />,
    },
    {
      to: '/informacion#faq',
      texto: t('ayudaPage.faqTitle'),
      detalle: t('ayudaPage.faqDetalle'),
      icono: <AccesoAyuda />,
    },
    {
      to: '/contacto',
      texto: t('ayudaPage.contactoTitle'),
      detalle: t('ayudaPage.contactoDetalle'),
      icono: <AccesoAyuda />,
    },
  ]

  return (
    <>
      <Seo
        title="Centro de ayuda — HotClick"
        description="Servicios HOT, garantía, devoluciones, envíos y contacto: todo lo que necesitás para comprar en HotClick."
        url="https://hotclick.lat/ayuda"
      />
      <PaginaInformativa titulo={t('ayudaPage.title')} subtitulo={t('ayudaPage.subtitle')}>
        <ListaAccesos accesos={accesos} etiqueta={t('ayudaPage.title')} />
      </PaginaInformativa>
    </>
  )
}
