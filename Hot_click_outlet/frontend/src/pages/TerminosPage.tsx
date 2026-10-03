import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

import PaginaLegal, { type EnlaceLegal } from '@/components/comprador/PaginaLegal'

const SITE_URL = 'https://hotclick.lat'
const LAST_UPDATED = '5 de junio de 2025'

const termsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Términos y Condiciones — HotClick',
  description: 'Términos y condiciones de uso de HotClick Marketplace Costa Rica. Condiciones para compradores y vendedores emprendedores.',
  url: `${SITE_URL}/terminos`,
  inLanguage: 'es-CR',
  isPartOf: { '@type': 'WebSite', name: 'HotClick', url: SITE_URL },
  about: { '@type': 'Thing', name: 'Términos y condiciones de uso de marketplace' },
  dateModified: '2025-06-05',
}

const clausulas = [
  {
    id: 'naturaleza',
    num: 'CLÁUSULA PRIMERA',
    title: 'Naturaleza Jurídica de la Plataforma',
    content: (
      <>
        <p>HotClick opera bajo un <strong>modelo comercial híbrido</strong> que comprende dos modalidades diferenciadas:</p>
        <ul>
          <li><strong>Venta directa HotClick:</strong> HotClick adquiere productos de diversas marcas en canales de liquidación y outlets, y los comercializa directamente al consumidor final bajo su propia marca y responsabilidad. En estas transacciones, HotClick actúa como vendedor y la relación contractual se perfecciona entre HotClick y el Cliente.</li>
          <li><strong>Marketplace de emprendedores:</strong> HotClick pone a disposición su plataforma tecnológica para que negocios y emprendedores costarricenses publiquen y vendan sus propios productos con su nombre de marca. En estas transacciones, el contrato de compraventa se perfecciona entre el Cliente y el Vendedor correspondiente, actuando HotClick únicamente como intermediario tecnológico.</li>
        </ul>
        <p>En cada producto publicado se indicará claramente si es vendido directamente por HotClick o por un vendedor del marketplace.</p>
      </>
    ),
  },
  {
    id: 'capacidad',
    num: 'CLÁUSULA SEGUNDA',
    title: 'Capacidad Legal y Registro',
    content: (
      <p>El uso de la Plataforma está reservado exclusivamente para personas físicas con capacidad legal plena para contratar (mayores de 18 años) o personas jurídicas debidamente representadas. El usuario es responsable de salvaguardar la confidencialidad de sus credenciales de acceso, asumiendo total responsabilidad por las transacciones ejecutadas bajo su perfil de usuario.</p>
    ),
  },
  {
    id: 'comisiones',
    num: 'CLÁUSULA TERCERA',
    title: 'Condiciones Económicas y Comisiones (Vendedores)',
    content: (
      <p>El Vendedor acepta que el uso de los servicios de intermediación de la Plataforma está sujeto al pago de una comisión por transacción efectiva según el plan contratado: plan Emprendedor (sin membresía) 9% del total bruto del pedido con un mínimo de ₡700; planes PYME y Negocio Plus 4% del total bruto además de la mensualidad publicada. HotClick gestiona la pasarela de pagos (incluidos los costos de ONVO) y retiene los montos correspondientes a sus honorarios antes de liquidar los saldos netos a favor del Vendedor, en los plazos y formas pactados internamente.</p>
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
          <li><strong>Productos vendidos directamente por HotClick:</strong> HotClick asume plena responsabilidad por la calidad, idoneidad y garantía legal de los productos que comercializa directamente, conforme a la Ley de Promoción de la Competencia y Defensa Efectiva del Consumidor (Ley N.° 7472).</li>
          <li><strong>Productos de vendedores del marketplace:</strong> HotClick no ejerce control sobre la calidad, seguridad, originalidad o licitud de los productos ofrecidos por vendedores independientes. En consecuencia, para compras a vendedores del marketplace, la responsabilidad por vicios ocultos, defectos de fabricación y garantías legales recae exclusiva y directamente en el Vendedor ante el MEIC. HotClick queda exenta de responsabilidad civil, penal o administrativa por tales productos.</li>
        </ul>
        <p>En ningún caso HotClick será responsable por retrasos del operador logístico ni por daños derivados del incumplimiento de las instrucciones del fabricante o vendedor.</p>
      </>
    ),
  },
  {
    id: 'pagos',
    num: 'CLÁUSULA QUINTA',
    title: 'Procesamiento de Pagos e Indemnidad por Datos Bancarios',
    content: (
      <>
        <p>Todos los pagos realizados en la Plataforma son procesados de forma segura a través del proveedor de pago autorizado Stripe. Los precios se expresan en colones costarricenses (₡) e incluyen los impuestos aplicables.</p>
        <p><strong>Deslinde expreso de responsabilidad financiera:</strong> HotClick declara expresamente que no recopila, no almacena, no procesa ni tiene acceso a datos sensibles de carácter financiero o bancario de los Clientes, tales como números de tarjetas de crédito o débito, fechas de vencimiento, ni códigos de seguridad (CVV/CVC).</p>
        <p>Todas las transacciones económicas se ejecutan de manera directa y exclusiva a través de una pasarela de pagos integrada, operada por un tercero proveedor de servicios financieros debidamente autorizado y certificado bajo los estándares internacionales de seguridad <strong>PCI-DSS</strong> (Payment Card Industry Data Security Standard). En consecuencia, HotClick queda exenta de toda responsabilidad civil, penal o comercial derivada de eventuales vulneraciones de seguridad, clonaciones, fraudes, fallas informáticas o suplantaciones de identidad que ocurran dentro del entorno operativo de dicha pasarela de pagos.</p>
      </>
    ),
  },
  {
    id: 'propiedad',
    num: 'CLÁUSULA SEXTA',
    title: 'Propiedad Intelectual',
    content: (
      <p>El nombre comercial, logotipo, diseño gráfico, código fuente, estructura y contenidos editoriales de HotClick se encuentran protegidos por la Ley de Derechos de Autor y Derechos Conexos (Ley N.° 6683) de Costa Rica. Queda prohibida su reproducción, distribución o explotación comercial sin autorización escrita previa de HotClick.</p>
    ),
  },
  {
    id: 'modificacion',
    num: 'CLÁUSULA SÉPTIMA',
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
      <p>HotClick utiliza cookies técnicas obligatorias (autenticación, carrito de compras) y cookies analíticas de terceros (Google Analytics 4) activadas únicamente con consentimiento expreso del usuario. El usuario conserva la facultad de configurar su navegador para bloquear o eliminar las cookies en cualquier momento, aceptando que la desactivación de las cookies técnicas puede impedir la ejecución de compras. Para consultar el detalle completo de las tecnologías de seguimiento utilizadas, sus finalidades y plazos de vigencia, véase la <Link to="/cookies">Política de Cookies</Link> de la Plataforma.</p>
    ),
  },
  {
    id: 'jurisdiccion',
    num: 'CLÁUSULA DÉCIMA',
    title: 'Jurisdicción y Ley Aplicable',
    content: (
      <p>El presente instrumento se rige por las leyes de la República de Costa Rica. Para la resolución de controversias, las partes se someten a la jurisdicción de los Tribunales de Justicia de San José, Costa Rica, con renuncia expresa a cualquier otro fuero. Con carácter previo, las partes intentarán la resolución amistosa mediante comunicación dirigida a <a href="mailto:hotclick.cr@gmail.com">hotclick.cr@gmail.com</a> por un período mínimo de treinta (30) días.</p>
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
        subtitulo={`Contrato de Adhesión · Última actualización: ${LAST_UPDATED}`}
        intro={<p>Las presentes condiciones generales regulan el acceso, registro y uso de la plataforma web y de comercio electrónico denominada HotClick. Todo usuario que acceda, navegue o interactúe en la Plataforma se adhiere de pleno derecho a lo aquí estipulado.</p>}
        secciones={clausulas}
        pregunta="¿Preguntas sobre estos términos?"
        correo="hotclick.cr@gmail.com"
        enlaces={ENLACES}
      />
    </>
  )
}
