import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PaginaLegal, { type EnlaceLegal } from '@/components/comprador/PaginaLegal'
import BloqueIdentidad from '@/legal/BloqueIdentidad'
import { IDENTIDAD_COMERCIANTE, POLITICAS_ACTUALIZADAS, POLITICAS_ACTUALIZADAS_ISO } from '@/legal/identidadComerciante'

const SITE_URL = IDENTIDAD_COMERCIANTE.sitio

const termsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Términos y Condiciones — HotClick',
  description: 'Términos y condiciones de uso de HotClick Marketplace Costa Rica. Condiciones para compradores y vendedores emprendedores.',
  url: `${SITE_URL}/terminos`,
  inLanguage: 'es-CR',
  isPartOf: { '@type': 'WebSite', name: 'HotClick', url: SITE_URL },
  about: { '@type': 'Thing', name: 'Términos y condiciones de uso de marketplace' },
  dateModified: POLITICAS_ACTUALIZADAS_ISO,
}

const clausulas = [
  {
    id: 'naturaleza',
    num: 'CLÁUSULA PRIMERA',
    title: 'Naturaleza Jurídica de la Plataforma',
    content: (
      <>
        <p>HotClick opera como <strong>marketplace</strong>: cada producto lo vende un negocio independiente.</p>
        <ul>
          <li><strong>Marketplace de emprendedores:</strong> HotClick pone a disposición su plataforma tecnológica para que negocios y emprendedores costarricenses publiquen y vendan sus propios productos con su nombre de marca. En estas transacciones, el contrato de compraventa se perfecciona entre el Cliente y el Vendedor correspondiente, actuando HotClick únicamente como intermediario tecnológico.</li>
        </ul>
        <p>En cada producto publicado se indica qué tienda lo vende.</p>
        <BloqueIdentidad />
      </>
    ),
  },
  {
    id: 'capacidad',
    num: 'CLÁUSULA SEGUNDA',
    title: 'Capacidad Legal y Registro',
    content: (
      <>
        <p>El uso de la Plataforma está reservado exclusivamente para personas físicas con capacidad legal plena para contratar (mayores de 18 años) o personas jurídicas debidamente representadas. En el registro, el usuario declara esa mayoría de edad. El usuario es responsable de salvaguardar la confidencialidad de sus credenciales de acceso, asumiendo total responsabilidad por las transacciones ejecutadas bajo su perfil de usuario.</p>
        <p>No se permiten cuentas de personas menores de edad. Si HotClick advierte que una cuenta pertenece a un menor, la cerrará y devolverá, cuando corresponda, las sumas no ejecutadas. Los padres o tutores pueden escribir a <a href={`mailto:${IDENTIDAD_COMERCIANTE.correo}`} style={{ color: 'var(--hc-accent)' }}>{IDENTIDAD_COMERCIANTE.correo}</a>.</p>
      </>
    ),
  },
  {
    id: 'comisiones',
    num: 'CLÁUSULA TERCERA',
    title: 'Condiciones Económicas y Comisiones (Vendedores)',
    content: (
      <p>El Vendedor acepta que el uso de los servicios de intermediación de la Plataforma está sujeto al pago de una comisión por transacción efectiva según el plan contratado: porcentajes [PENDIENTE] que se publican en /planes antes de contratar, además de la mensualidad del plan cuando corresponda. HotClick gestiona la pasarela de pagos (Tilopay para tarjeta y ONVO para las mensualidades) y retiene los montos correspondientes a sus honorarios antes de liquidar los saldos netos a favor del Vendedor, en los plazos y formas pactados internamente.</p>
    ),
  },
  {
    id: 'responsabilidad',
    num: 'CLÁUSULA CUARTA',
    title: 'Exclusión de Responsabilidad',
    content: (
      <>
        <p>La responsabilidad sobre los productos varía según la modalidad de venta:</p>
        <ul>
          <li><strong>Productos vendidos directamente por HotClick:</strong> HotClick responde por la calidad, la idoneidad y la garantía legal de esos productos, conforme a la Ley N.° 7472.</li>
          <li><strong>Productos de vendedores del marketplace:</strong> el contrato de compraventa del bien es entre el Cliente y el Vendedor. El Vendedor responde por la conformidad, los vicios y la garantía del producto. HotClick mantiene un canal gratuito de reclamo y media entre las partes.</li>
        </ul>
        <p>Esta cláusula no limita derechos que la Ley N.° 7472 reconoce al consumidor. HotClick responde por el canal de compra, el cobro y la información publicada en la Plataforma. El retraso del operador logístico y el daño por un uso distinto al indicado por el fabricante o el vendedor se reclaman según esa causa.</p>
      </>
    ),
  },
  {
    id: 'pagos',
    num: 'CLÁUSULA QUINTA',
    title: 'Procesamiento de Pagos e Indemnidad por Datos Bancarios',
    content: (
      <>
        <p>Los precios se expresan en colones costarricenses (₡) e incluyen los impuestos aplicables. El costo de envío se muestra antes de confirmar el pago.</p>
        <p>HotClick acepta SINPE Móvil y tarjetas Visa y Mastercard. El cobro con tarjeta lo procesan pasarelas certificadas (Tilopay para pagos con tarjeta y ONVO para las mensualidades de los planes). HotClick no recopila, no almacena ni tiene acceso al número completo de la tarjeta, la fecha de vencimiento ni el código de seguridad (CVV/CVC).</p>
        <p>Cuando procede un reembolso, vuelve por el mismo medio usado para pagar.</p>
      </>
    ),
  },
  {
    id: 'retracto',
    num: 'CLÁUSULA SEXTA',
    title: 'Retracto, devoluciones y garantía',
    content: (
      <>
        <p>En las compras a distancia el Cliente puede retractarse dentro de los <strong>8 días hábiles</strong> siguientes a la confirmación del pago, que es el perfeccionamiento del contrato, conforme a la Ley N.° 7472 y su reglamento. El retracto se ejerce en la Plataforma o por el mismo medio usado para comprar, y el reembolso vuelve por el mismo medio de pago.</p>
        <p>La garantía comercial por defectos de fabricación es de hasta <strong>40 días</strong> desde la recepción y no sustituye al retracto. Las excepciones (higiene personal, productos personalizados, bienes digitales ya entregados y artículos usados o dañados por el comprador) están en la <Link to="/devoluciones" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Política de Devoluciones</Link>, visible antes de pagar.</p>
      </>
    ),
  },
  {
    id: 'propiedad',
    num: 'CLÁUSULA SÉPTIMA',
    title: 'Propiedad Intelectual',
    content: (
      <p>El nombre comercial, logotipo, diseño gráfico, código fuente, estructura y contenidos editoriales de HotClick se encuentran protegidos por la Ley de Derechos de Autor y Derechos Conexos (Ley N.° 6683) de Costa Rica. Queda prohibida su reproducción, distribución o explotación comercial sin autorización escrita previa de HotClick.</p>
    ),
  },
  {
    id: 'modificacion',
    num: 'CLÁUSULA OCTAVA',
    title: 'Modificación de Términos',
    content: (
      <p>HotClick se reserva el derecho de modificar los presentes Términos y Condiciones en cualquier momento. Las modificaciones significativas serán comunicadas mediante aviso en la Plataforma o correo electrónico con una antelación mínima de quince (15) días. El uso continuado de la Plataforma constituirá aceptación de los términos modificados.</p>
    ),
  },
  {
    id: 'cookies',
    num: 'CLÁUSULA NOVENA',
    title: 'Política de Cookies y Almacenamiento Local',
    content: (
      <p>HotClick utiliza cookies técnicas obligatorias (autenticación y carrito) y cookies de analítica o publicidad (Google Analytics 4, PostHog, Microsoft Clarity y Meta) activadas únicamente con consentimiento expreso del usuario. El usuario puede bloquear o eliminar las cookies en el navegador. Desactivar las cookies técnicas puede impedir la compra. El detalle está en la <Link to="/cookies" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Política de Cookies</Link>.</p>
    ),
  },
  {
    id: 'ia',
    num: 'CLÁUSULA DÉCIMA',
    title: 'Asistentes de inteligencia artificial',
    content: (
      <p>El chat de la tienda es un asistente de inteligencia artificial y no una persona. Sus respuestas son orientativas y no modifican precios, existencias ni las condiciones publicadas. El usuario no debe ingresar datos de menores ni información sensible (salud, orientación sexual, biometría o datos de terceros) en el chat.</p>
    ),
  },
  {
    id: 'jurisdiccion',
    num: 'CLÁUSULA UNDÉCIMA',
    title: 'Jurisdicción y Ley Aplicable',
    content: (
      <p>El presente instrumento se rige por las leyes de la República de Costa Rica. Para la resolución de controversias, las partes se someten a la jurisdicción de los Tribunales de Justicia de San José, Costa Rica, con renuncia expresa a cualquier otro fuero. Con carácter previo, las partes intentarán la resolución amistosa mediante comunicación dirigida a <a href={`mailto:${IDENTIDAD_COMERCIANTE.correo}`} style={{ color: 'var(--hc-accent)' }}>{IDENTIDAD_COMERCIANTE.correo}</a> por un período mínimo de treinta (30) días.</p>
    ),
  },
]

const ENLACES: EnlaceLegal[] = [
  { to: '/envios', texto: 'Envíos' },
  { to: '/devoluciones', texto: 'Devoluciones' },
  { to: '/privacidad', texto: 'Privacidad' },
  { to: '/cookies', texto: 'Cookies' },
]

export default function TerminosPage() {
  return (
    <>
      <Helmet>
        <title>Términos y Condiciones — HotClick Costa Rica</title>
        <meta name="description" content="Términos y condiciones de uso de HotClick Marketplace. Condiciones para compradores y vendedores emprendedores costarricenses." />
        <link rel="canonical" href={`${SITE_URL}/terminos`} />
        <link rel="alternate" hrefLang="es-CR" href={`${SITE_URL}/terminos`} />
        <link rel="alternate" hrefLang="es" href={`${SITE_URL}/terminos`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
        <meta name="robots" content="noindex, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Términos y Condiciones — HotClick" />
        <meta property="og:url" content={`${SITE_URL}/terminos`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(termsJsonLd)}</script>
      </Helmet>
      <PaginaLegal
        titulo="Términos"
        encabezado="Términos y Condiciones de Uso"
        subtitulo={`Contrato de Adhesión · Última actualización: ${POLITICAS_ACTUALIZADAS}`}
        intro={<p>Las presentes condiciones generales regulan el acceso, registro y uso de la plataforma web y de comercio electrónico denominada HotClick. Todo usuario que acceda, navegue o interactúe en la Plataforma se adhiere de pleno derecho a lo aquí estipulado.</p>}
        secciones={clausulas}
        pregunta="¿Preguntas sobre estos términos?"
        correo={IDENTIDAD_COMERCIANTE.correo}
        enlaces={ENLACES}
      />
    </>
  )
}
