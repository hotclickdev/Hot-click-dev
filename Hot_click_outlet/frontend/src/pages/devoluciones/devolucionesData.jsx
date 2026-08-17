import { Link } from 'react-router-dom'

export const SITE_URL = 'https://hotclick.lat'
export const LAST_UPDATED = '5 de junio de 2025'

export const returnPolicyJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MerchantReturnPolicy',
  name: 'Política de devoluciones HotClick',
  description: 'Tenés 7 días hábiles desde la recepción para solicitar cambio o devolución de cualquier producto comprado en HotClick.',
  url: `${SITE_URL}/devoluciones`,
  inLanguage: 'es-CR',
  applicableCountry: 'CR',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
  merchantReturnLink: `${SITE_URL}/devoluciones`,
  refundType: 'https://schema.org/FullRefund',
}

export const badges = [
  { icon: '📦', title: '7 días hábiles', desc: 'Para solicitar devolución' },
  { icon: '💬', title: 'Proceso simple', desc: 'Contactás al emprendedor' },
  { icon: '💳', title: 'Reembolso garantizado', desc: 'En productos defectuosos' },
]

export const sections = [
  {
    id: 'resumen',
    title: '1. Resumen de la Política',
    content: (
      <>
        <p>En HotClick queremos que tu experiencia de compra sea 100% satisfactoria. Si por alguna razón no estás conforme con tu pedido, tenés <strong>7 días hábiles</strong> desde la fecha de recepción para solicitar un cambio o devolución.</p>
        <p>Dado que HotClick es un marketplace que conecta compradores con emprendedores costarricenses, el proceso de devolución se coordina directamente con el emprendedor vendedor.</p>
      </>
    ),
  },
  {
    id: 'aplica',
    title: '2. ¿Cuándo aplica una devolución?',
    content: (
      <>
        <p>Podés solicitar devolución en los siguientes casos:</p>
        <ul>
          <li><strong>Producto defectuoso:</strong> el artículo llegó dañado o con fallas de fabricación.</li>
          <li><strong>Producto incorrecto:</strong> recibiste un artículo diferente al que compraste (modelo, color, talla u otro).</li>
          <li><strong>Producto incompleto:</strong> faltaron partes, accesorios o piezas que se anunciaban incluidas.</li>
          <li><strong>Producto no conforme:</strong> el artículo difiere significativamente de la descripción o imágenes del anuncio.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'no-aplica',
    title: '3. ¿Cuándo NO aplica devolución?',
    content: (
      <>
        <p>No se aceptan devoluciones en los siguientes casos:</p>
        <ul>
          <li>Productos con más de 7 días hábiles desde la recepción.</li>
          <li>Artículos usados, dañados por el comprador o sin embalaje original.</li>
          <li>Productos personalizados o hechos a medida.</li>
          <li>Artículos de higiene personal (ropa interior, trajes de baño, etc.) por razones sanitarias.</li>
          <li>Productos digitales o servicios ya entregados.</li>
          <li>Cuando el motivo es simplemente "arrepentimiento de compra" sin defecto alguno (queda a criterio del emprendedor).</li>
        </ul>
      </>
    ),
  },
  {
    id: 'proceso',
    title: '4. Proceso de Devolución',
    content: (
      <>
        <p>Seguí estos pasos para iniciar una devolución:</p>
        <ul>
          <li>
            <strong>Paso 1 — Contactar al emprendedor:</strong> escribí al vendedor dentro de los 7 días hábiles. Podés hacerlo vía WhatsApp desde la página de tu pedido en <Link to="/mis-pedidos" style={{ color: 'var(--hc-accent)' }}>Mis Pedidos</Link>.
          </li>
          <li>
            <strong>Paso 2 — Describir el problema:</strong> indicá el número de pedido, el motivo de la devolución y adjuntá fotos o video que muestren el problema.
          </li>
          <li>
            <strong>Paso 3 — Acuerdo de devolución:</strong> el emprendedor te indicará cómo proceder: envío del producto, punto de recogida o solución alternativa.
          </li>
          <li>
            <strong>Paso 4 — Reembolso o reemplazo:</strong> una vez verificado el problema, el emprendedor procesará el reembolso o enviará el producto de reemplazo.
          </li>
        </ul>
        <p>Si no lográs llegar a un acuerdo con el emprendedor, contactanos a <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a> para mediar en el proceso.</p>
      </>
    ),
  },
  {
    id: 'reembolsos',
    title: '5. Reembolsos',
    content: (
      <>
        <p>Los reembolsos se procesan de la siguiente manera según el método de pago original:</p>
        <ul>
          <li><strong>Tarjeta de crédito/débito (Stripe):</strong> el reembolso se acredita en 5 a 10 días hábiles dependiendo del banco emisor.</li>

          <li><strong>SINPE Móvil:</strong> el reembolso se hace por SINPE al número registrado en un plazo de 1 a 3 días hábiles.</li>
        </ul>
        <p>En todos los casos, recibirás una confirmación por correo electrónico cuando el reembolso sea procesado.</p>
      </>
    ),
  },
  {
    id: 'envio-devolucion',
    title: '6. Costos de Envío en Devoluciones',
    content: (
      <ul>
        <li><strong>Producto defectuoso o incorrecto:</strong> el emprendedor asume el costo del envío de devolución y del reenvío.</li>
        <li><strong>Cambio por talla, color u otra razón del comprador:</strong> el costo de envío de ida y vuelta es responsabilidad del comprador, salvo acuerdo diferente con el emprendedor.</li>
      </ul>
    ),
  },
  {
    id: 'contacto',
    title: '7. ¿Necesitás Ayuda?',
    content: (
      <>
        <p>Si tenés dudas sobre tu devolución o necesitás que HotClick intervenga como mediador, contactanos:</p>
        <ul>
          <li><strong>Correo:</strong> <a href="mailto:hotclick.cr@gmail.com" style={{ color: 'var(--hc-accent)' }}>hotclick.cr@gmail.com</a></li>
          <li><strong>WhatsApp:</strong> <a href="https://wa.me/50686667888" style={{ color: 'var(--hc-accent)' }} target="_blank" rel="noopener noreferrer">+506 8666-7888</a></li>
          <li><strong>Horario:</strong> Lunes a Sábado, 8:00 am – 7:00 pm</li>
        </ul>
      </>
    ),
  },
]
