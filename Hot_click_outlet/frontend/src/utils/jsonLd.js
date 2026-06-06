const SITE_NAME = 'HOTCLICK'
const SITE_URL = 'https://hot-click-dev-production.up.railway.app'

/**
 * Schema.org Product — enables price, availability and rich snippets in Google.
 * Accepts either a raw backend DTO or a normalized frontend product object.
 */
export function generateProductJsonLd(producto, urlBase) {
  const stock = producto.stockActual ?? producto.stock ?? 0
  const image = producto.imagenPrincipalUrl || producto.imagenUrl || ''
  const brand = producto.marcaNombre || producto.marcaTexto || producto.marca || SITE_NAME
  const description = producto.descripcionCorta || producto.descripcion || producto.nombre

  // priceValidUntil: 30 days from now, date-only (YYYY-MM-DD)
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.nombre,
    description,
    image,
    sku: producto.sku || String(producto.id),
    mpn: producto.sku || String(producto.id),
    brand: { '@type': 'Brand', name: brand },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'CRC',
      price: Math.round(producto.precio || producto.precioVenta || 0),
      priceValidUntil: validUntil,
      availability: stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${urlBase}/productos/${producto.id}`,
    },
  }

  /*
   * When product ratings are implemented, add AggregateRating here:
   *
   * if (producto.ratingPromedio && producto.totalResenas > 0) {
   *   ld.aggregateRating = {
   *     '@type': 'AggregateRating',
   *     ratingValue: producto.ratingPromedio,
   *     reviewCount: producto.totalResenas,
   *     bestRating: 5,
   *     worstRating: 1,
   *   }
   * }
   */

  return ld
}

/**
 * Schema.org WebSite — enables the Google sitelinks search box.
 */
export function generateWebsiteJsonLd(urlBase) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: urlBase,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${urlBase}/productos?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Schema.org OnlineStore — richer e-commerce signals for Google.
 * @param {string[]} socialUrls  Array of profile URLs (Facebook, Instagram, etc.)
 */
export function generateOrganizationJsonLd(urlBase, socialUrls = []) {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'OnlineStore'],
    name: SITE_NAME,
    alternateName: 'HOTCLICK Marketplace Costa Rica',
    description: 'Marketplace de emprendedores costarricenses. Productos únicos con envío a todo Costa Rica.',
    url: urlBase,
    logo: {
      '@type': 'ImageObject',
      url: `${urlBase}/favicon.svg`,
      width: 512,
      height: 512,
    },
    image: `${urlBase}/og-image.png`,
    priceRange: '₡₡',
    currenciesAccepted: 'CRC',
    paymentAccepted: 'SINPE Móvil, Visa, Mastercard',
    areaServed: {
      '@type': 'Country',
      name: 'Costa Rica',
      sameAs: 'https://www.wikidata.org/wiki/Q800',
    },
    foundingDate: '2024',
    knowsLanguage: 'es-CR',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+506-8974-5370',
      contactOption: 'TollFree',
      availableLanguage: ['Spanish'],
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '08:00',
        closes: '19:00',
      },
    },
    sameAs: socialUrls,
  }
}

/**
 * Schema.org FAQPage — enables rich FAQ snippets in Google search results.
 */
export function generateFAQJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Qué es HOTCLICK?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'HOTCLICK es el marketplace de emprendedores costarricenses donde podés comprar miles de productos únicos: tecnología, ropa, accesorios, artículos del hogar y más, con envío a todo Costa Rica.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Cómo hago un pedido en HOTCLICK?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Es muy fácil: buscá el producto, agregalo al carrito, completá el checkout con tus datos de envío y pagá de forma segura con SINPE Móvil, Visa o Mastercard. Recibirás confirmación por email.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Cuánto tarda el envío en Costa Rica?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'El envío a todo Costa Rica tarda entre 1 y 5 días hábiles dependiendo de tu zona. Ofrecemos envío express y entrega a domicilio en las principales ciudades.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué métodos de pago aceptan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Aceptamos SINPE Móvil, tarjetas Visa y Mastercard. Todos los pagos son procesados de forma segura con encriptación SSL.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Puedo devolver un producto?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sí, tenemos política de devoluciones. Si el producto llegó dañado o no coincide con la descripción, contáctanos por WhatsApp al +506 8974-5370 dentro de los 7 días después de recibir tu pedido.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Cómo puedo vender mis productos en HOTCLICK?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Registrá tu emprendimiento en HOTCLICK gratis. Sin comisiones el primer mes, tu tienda activa en 24 horas. Visitá la sección "Vendé con nosotros" para comenzar.',
        },
      },
    ],
  }
}

/**
 * Schema.org BreadcrumbList — structured navigation path.
 * @param {Array<{name: string, url: string}>} items
 */
export function generateBreadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Schema.org ItemList — for product listing pages.
 * @param {Array<{id: string|number, name: string, url?: string, image?: string, price?: number}>} products
 * @param {string} urlBase
 */
export function generateItemListJsonLd(products, urlBase) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Productos destacados de HOTCLICK',
    description: 'Los mejores productos de emprendedores costarricenses',
    numberOfItems: products.length,
    itemListElement: products.slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${urlBase}/productos/${p.id}`,
      name: p.nombre || p.name,
    })),
  }
}
