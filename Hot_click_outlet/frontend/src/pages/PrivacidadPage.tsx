import { Helmet } from 'react-helmet-async'
import PaginaLegal, { type EnlaceLegal } from '@/components/comprador/PaginaLegal'
import BloqueIdentidad from '@/legal/BloqueIdentidad'
import { IDENTIDAD_COMERCIANTE, POLITICAS_ACTUALIZADAS, POLITICAS_ACTUALIZADAS_ISO } from '@/legal/identidadComerciante'

const SITE_URL = IDENTIDAD_COMERCIANTE.sitio

const privacyJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Política de Privacidad — HotClick',
  description: 'Política de privacidad y protección de datos personales de HotClick conforme a la Ley N.° 8968 de Costa Rica.',
  url: `${SITE_URL}/privacidad`,
  inLanguage: 'es-CR',
  isPartOf: { '@type': 'WebSite', name: 'HotClick', url: SITE_URL },
  about: { '@type': 'Thing', name: 'Protección de datos personales — Ley 8968 Costa Rica' },
  dateModified: POLITICAS_ACTUALIZADAS_ISO,
}

const secciones = [
  {
    id: 'responsable',
    num: 'SECCIÓN I',
    title: 'Identidad del Responsable',
    content: <BloqueIdentidad />,
  },
  {
    id: 'datos',
    num: 'SECCIÓN II',
    title: 'Categorías de Datos y Finalidad del Tratamiento',
    content: (
      <>
        <p>Para el correcto funcionamiento del ecosistema digital, HotClick recopilará datos personales de carácter identificativo y de contacto, a saber: nombre completo, número de identificación (cédula física, jurídica o DIMEX), dirección exacta de entrega, correo electrónico y número telefónico.</p>
        <p>Dichos datos serán tratados exclusivamente para las siguientes finalidades:</p>
        <ul>
          <li>Gestionar el registro de usuarios y la personalización de la experiencia en la Plataforma.</li>
          <li>Procesar, validar y facturar las transacciones comerciales.</li>
          <li>Notificar los estados de envío y gestionar la logística inversa (devoluciones).</li>
          <li>Responder consultas del asistente de chat con IA: los mensajes pueden procesarse para generar la respuesta y conservarse en registros operativos el tiempo necesario para soporte y mejora del servicio.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'transferencia',
    num: 'SECCIÓN III',
    title: 'Transferencia Expresa de Datos a Terceros Encargados',
    content: (
      <>
        <p>En estricto cumplimiento del principio de legalidad, se informa al Cliente sobre las siguientes transferencias de datos según la modalidad de compra:</p>
        <ul>
          <li><strong>Compras directas a HotClick:</strong> los datos de contacto y entrega son procesados exclusivamente por HotClick para ejecutar el pedido. No se transfieren a vendedores externos.</li>
          <li><strong>Compras a vendedores del marketplace:</strong> HotClick transferirá los datos de contacto e identificación del Cliente (nombre, teléfono y dirección) al Vendedor específico que deba entregar el producto. Esta transferencia es estrictamente necesaria para la ejecución del contrato de compraventa. El Vendedor receptor adquirirá la condición jurídica de "Encargado de Tratamiento" y estará sujeto a las limitaciones de la Ley N.° 8968.</li>
        </ul>
        <p>Adicionalmente, HotClick utiliza los siguientes proveedores que actúan como encargados del tratamiento:</p>
        <ul>
          <li><strong>Tilopay, Stripe y ONVO:</strong> cobro con tarjeta. HotClick no guarda el número de tarjeta ni el código de seguridad.</li>
          <li><strong>SINPE Móvil:</strong> el comprobante que sube el cliente puede incluir nombre, teléfono y cédula del remitente, solo para verificar el pago.</li>
          <li><strong>SendGrid:</strong> correos transaccionales del pedido.</li>
          <li><strong>Clerk:</strong> inicio de sesión con Google, Microsoft o Apple.</li>
          <li><strong>Correos de Costa Rica:</strong> entrega de envíos en el país.</li>
          <li><strong>Amazon Web Services:</strong> almacenamiento de imágenes y archivos de la plataforma.</li>
          <li><strong>Anthropic (Claude):</strong> mensajes del chat de la tienda, para generar la respuesta y dar soporte.</li>
          <li><strong>Sentry:</strong> diagnóstico de errores técnicos. Puede recibir identificadores técnicos y no se usa para publicidad.</li>
          <li><strong>Google Analytics 4, PostHog, Microsoft Clarity y Meta:</strong> medición y publicidad, solo con consentimiento previo en el banner de cookies.</li>
        </ul>
        <p><strong>HotClick no vende, cede a título oneroso ni comercializa los datos personales de sus usuarios con terceros bajo ninguna circunstancia.</strong></p>
      </>
    ),
  },
  {
    id: 'arco',
    num: 'SECCIÓN IV',
    title: 'Mecanismo de Ejercicio de Derechos ARCO',
    content: (
      <>
        <p>Cualquier titular de datos personales podrá ejercer en cualquier momento sus derechos de <strong>Acceso, Rectificación, Cancelación y Oposición (ARCO)</strong>. Para tales efectos, deberá remitir una solicitud formal al correo electrónico <a href={`mailto:${IDENTIDAD_COMERCIANTE.correo}`}>{IDENTIDAD_COMERCIANTE.correo}</a>.</p>
        <p>HotClick tramitará y resolverá dicha petición en un plazo perentorio que no excederá los diez (10) días hábiles, conforme lo dispone la normativa de la PRODHAB. El titular también tiene derecho a presentar reclamaciones directamente ante la <strong>Agencia de Protección de Datos de los Habitantes (PRODHAB)</strong>.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    num: 'SECCIÓN V',
    title: 'Cookies y Tecnologías Similares',
    content: (
      <>
        <p><strong>Google Analytics 4, PostHog, Microsoft Clarity y Meta:</strong> medición y publicidad activadas únicamente con consentimiento expreso del titular en el banner de cookies de la Plataforma.</p>
        <p><strong>Almacenamiento local (localStorage):</strong> Utilizado para conservar en el dispositivo del titular su carrito de compras y preferencias de interfaz. Este almacenamiento no implica transferencia de datos a servidores externos y es estrictamente necesario para el funcionamiento básico de la Plataforma.</p>
      </>
    ),
  },
  {
    id: 'retencion',
    num: 'SECCIÓN VI',
    title: 'Retención de Datos',
    content: (
      <ul>
        <li><strong>Datos de pedidos y transacciones:</strong> cinco (5) años, en cumplimiento de obligaciones fiscales ante el Ministerio de Hacienda de Costa Rica.</li>
        <li><strong>Registros de actividad técnica:</strong> noventa (90) días naturales.</li>
        <li><strong>Datos de carrito abandonado:</strong> treinta (30) días naturales.</li>
        <li><strong>Cuenta activa de usuario:</strong> mientras el titular mantenga su cuenta. Ante solicitud de supresión, eliminación en un plazo máximo de treinta (30) días hábiles, salvo obligación legal de conservación.</li>
      </ul>
    ),
  },
  {
    id: 'seguridad',
    num: 'SECCIÓN VII',
    title: 'Seguridad',
    content: (
      <p>HotClick implementa las siguientes medidas de seguridad: transmisión cifrada mediante protocolo HTTPS/TLS, almacenamiento de contraseñas mediante hash bcrypt (nunca en texto plano), tokens JWT con tiempo de expiración reducido y tokens de refresco de rotación automática, auditoría de acciones administrativas sobre datos sensibles, y acceso restringido al personal autorizado bajo el principio de mínimo privilegio. En caso de brecha de seguridad, HotClick notificará a las autoridades competentes y a los titulares afectados conforme a la Ley N.° 8968.</p>
    ),
  },
  {
    id: 'menores',
    num: 'SECCIÓN VIII',
    title: 'Personas menores de edad',
    content: (
      <>
        <p>La Plataforma está dirigida a personas mayores de dieciocho (18) años, con capacidad legal para contratar según el Código Civil de Costa Rica. No se permite el registro ni la compra a personas menores de edad.</p>
        <p>HotClick no recaba de forma intencional datos de personas menores de trece (13) años. Si un padre, madre o tutor advierte que un menor creó una cuenta o suministró datos, debe escribir a <a href={`mailto:${IDENTIDAD_COMERCIANTE.correo}`} style={{ color: 'var(--hc-accent)' }}>{IDENTIDAD_COMERCIANTE.correo}</a>. HotClick cerrará la cuenta y eliminará o anonimizará esos datos, salvo la conservación fiscal de comprobantes cuando exista una compra.</p>
        <p>El consentimiento para tratar datos de un menor, cuando excepcionalmente proceda, lo otorga quien ejerza la patria potestad, conforme a la Sala Constitucional y a la Ley N.° 8968.</p>
      </>
    ),
  },
  {
    id: 'ia',
    num: 'SECCIÓN IX',
    title: 'Asistentes de inteligencia artificial',
    content: (
      <>
        <p>El chat de la tienda es un asistente de inteligencia artificial. No es una persona. Eso se indica en la ventana del chat antes de que el usuario escriba.</p>
        <p>Los mensajes pueden enviarse a <strong>Anthropic (Claude)</strong> para generar la respuesta. Se usan para atender la consulta, soporte y mejora del servicio. No se venden. El titular puede pedir la supresión de esos registros por el canal ARCO, con las excepciones legales de conservación.</p>
        <p>Las respuestas del asistente son orientativas. No sustituyen la ficha del producto, el precio publicado ni el contrato de compraventa.</p>
      </>
    ),
  },
]

const ENLACES: EnlaceLegal[] = [
  { to: '/envios', texto: 'Envíos' },
  { to: '/devoluciones', texto: 'Devoluciones' },
  { to: '/terminos', texto: 'Términos' },
  { to: '/cookies', texto: 'Cookies' },
]

export default function PrivacidadPage() {
  return (
    <>
      <Helmet>
        <title>Política de Privacidad — HotClick Costa Rica</title>
        <meta name="description" content="Política de privacidad de HotClick. Protección de datos personales conforme a la Ley N.° 8968 de Costa Rica. Conocé cómo usamos tu información." />
        <link rel="canonical" href={`${SITE_URL}/privacidad`} />
        <link rel="alternate" hrefLang="es-CR" href={`${SITE_URL}/privacidad`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
        <meta name="robots" content="noindex, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Política de Privacidad — HotClick" />
        <meta property="og:url" content={`${SITE_URL}/privacidad`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(privacyJsonLd)}</script>
      </Helmet>
      <PaginaLegal
        titulo="Privacidad"
        encabezado="Política de Privacidad"
        subtitulo={`Ley N.° 8968 · Costa Rica · Última actualización: ${POLITICAS_ACTUALIZADAS}`}
        intro={<p>De conformidad con la <strong>Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales (Ley N.° 8968)</strong> de la República de Costa Rica y su Reglamento (Decreto Ejecutivo N.° 37554-JP).</p>}
        secciones={secciones}
        pregunta="¿Desea ejercer sus derechos ARCO?"
        correo={IDENTIDAD_COMERCIANTE.correo}
        enlaces={ENLACES}
      />
    </>
  )
}
