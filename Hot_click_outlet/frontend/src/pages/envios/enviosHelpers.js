/** URL canónica del sitio (JSON-LD y Helmet). */
export const SITE_URL = 'https://hotclick.lat'

/** Fecha de última actualización del contenido de envíos. */
export const LAST_UPDATED = '21 de junio de 2026'

/** Datos estructurados de la página de envíos. No alterar el contenido. */
export const shippingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Logística HotClick — Envíos a todo Costa Rica',
  description: 'Información completa sobre envíos a todo Costa Rica: tiempos de entrega, couriers, costos y zonas de cobertura.',
  url: `${SITE_URL}/envios`,
  inLanguage: 'es-CR',
  isPartOf: { '@type': 'WebSite', name: 'HotClick', url: SITE_URL },
}

/**
 * Preguntas frecuentes de envíos (texto plano).
 * Los enlaces se aplican en EnviosFaq.
 * @type {{ q: string, a: string }[]}
 */
export const faqItems = [
  {
    q: '¿Los precios mostrados son exactos?',
    a: 'Los precios son estimados y pueden variar según el peso, dimensiones y destino exacto del paquete. El costo final se confirma al momento de procesar el pedido.',
  },
  {
    q: '¿Cómo puedo rastrear mi pedido?',
    a: 'Ingresá a "Mis Pedidos" para ver el estado en tiempo real. Si tu envío es por Correos de Costa Rica, recibirás un número de guía para rastrear en correos.go.cr.',
  },
  {
    q: '¿Qué pasa si hay algún problema con mi envío?',
    a: 'Escribinos a hotclick.cr@gmail.com con el número de pedido. También podés consultar nuestra Política de Devoluciones.',
  },
  {
    q: '¿Cubren toda Costa Rica?',
    a: 'Sí. Los envíos oficiales por Correos de Costa Rica cubren todo el territorio nacional, incluyendo zonas rurales y costeras.',
  },
]
