import { Link } from 'react-router-dom'
import BloqueIdentidad from '@/legal/BloqueIdentidad'
import { IDENTIDAD_COMERCIANTE, POLITICAS_ACTUALIZADAS } from '@/legal/identidadComerciante'

export const SITE_URL = IDENTIDAD_COMERCIANTE.sitio
export const LAST_UPDATED = POLITICAS_ACTUALIZADAS

export const returnPolicyJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MerchantReturnPolicy',
  name: 'Política de devoluciones HotClick',
  description: 'Tenés 8 días hábiles desde la confirmación del pago para ejercer el retracto en HotClick.',
  url: `${SITE_URL}/devoluciones`,
  inLanguage: 'es-CR',
  applicableCountry: 'CR',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 8,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
  merchantReturnLink: `${SITE_URL}/devoluciones`,
  refundType: 'https://schema.org/FullRefund',
}

export const resumen = [
  { icono: 'inicioCaja', title: '8 días hábiles [REVISIÓN LEGAL]', desc: 'Desde la confirmación del pago' },
  { icono: 'encargoChat', title: 'Proceso simple', desc: 'Contactás al emprendedor' },
  { icono: 'inicioEscudo', title: 'Reembolso garantizado', desc: 'En productos defectuosos' },
] as const

export const sections = [
  {
    id: 'resumen',
    title: '1. Resumen de la Política',
    content: (
      <>
        <p>En HotClick distinguimos dos protecciones:</p>
        <ul>
          <li><strong>Derecho de retracto:</strong> <strong>8 días hábiles</strong> [REVISIÓN LEGAL] desde la confirmación del pago (Ley N.° 7472). Se ejerce en la plataforma o por el mismo medio de la compra, y el reembolso vuelve por el mismo medio de pago.</li>
          <li><strong>Garantía del producto:</strong> hasta <strong>40 días</strong> [REVISIÓN LEGAL] desde la recepción por defectos de fabricación o fallos de funcionamiento.</li>
        </ul>
        <p>Dado que HotClick es un marketplace que conecta compradores con emprendedores costarricenses, el proceso se coordina con el vendedor; HotClick media si hace falta.</p>
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
          <li><strong>Derecho de retracto (Ley N.° 7472):</strong> arrepentimiento de compra dentro de los 8 días hábiles [REVISIÓN LEGAL] desde la confirmación del pago.</li>
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
          <li>Cuando ya pasaron 8 días hábiles desde la confirmación del pago, salvo que aplique la garantía por defecto.</li>
          <li>Artículos usados, dañados por el comprador o sin embalaje original.</li>
          <li>Productos personalizados o hechos a medida.</li>
          <li>Artículos de higiene personal (ropa interior, trajes de baño, etc.) por razones sanitarias.</li>
          <li>Productos digitales o servicios ya entregados.</li>
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
            <strong>Paso 1 — Avisar en el mismo medio:</strong> dentro de los 8 días hábiles [REVISIÓN LEGAL] desde la confirmación del pago, escribí desde <Link to="/mis-pedidos" className="font-semibold text-hc-blue-600">Mis Pedidos</Link> o al correo {IDENTIDAD_COMERCIANTE.correo}. WhatsApp sirve para consultas.
          </li>
          <li>
            <strong>Paso 2 — Describir el problema:</strong> indicá el número de pedido, el motivo de la devolución y adjuntá fotos o video que muestren el problema.
          </li>
          <li>
            <strong>Paso 3 — Acuerdo de devolución:</strong> te indicamos, junto con el emprendedor, cómo proceder: envío del producto, punto de recogida o solución alternativa.
          </li>
          <li>
            <strong>Paso 4 — Reembolso o reemplazo:</strong> una vez verificado el problema, el emprendedor procesará el reembolso o enviará el producto de reemplazo.
          </li>
        </ul>
        <p>Si no lográs llegar a un acuerdo con el emprendedor, escribinos a <a href={`mailto:${IDENTIDAD_COMERCIANTE.correo}`} className="font-semibold text-hc-blue-600">{IDENTIDAD_COMERCIANTE.correo}</a>. HotClick media el reclamo.</p>
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
          <li><strong>Tarjeta (Tilopay):</strong> el reembolso vuelve a la misma tarjeta en un plazo [PENDIENTE], según el banco emisor.</li>

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
          <li><strong>Correo:</strong> <a href={`mailto:${IDENTIDAD_COMERCIANTE.correo}`} className="font-semibold text-hc-blue-600">{IDENTIDAD_COMERCIANTE.correo}</a></li>
          <li><strong>WhatsApp:</strong> <a href={`https://wa.me/${IDENTIDAD_COMERCIANTE.telefonoWa}`} className="font-semibold text-hc-blue-600" target="_blank" rel="noopener noreferrer">{IDENTIDAD_COMERCIANTE.telefono}</a></li>
          <li><strong>Horario:</strong> Lun–Sáb 8:00–19:00</li>
        </ul>
        <BloqueIdentidad />
      </>
    ),
  },
]
