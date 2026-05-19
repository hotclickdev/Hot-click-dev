const SITE_NAME = 'HOTCLICK Outlet'

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
 * Schema.org Organization — associates social profiles with the brand.
 * @param {string[]} socialUrls  Array of profile URLs (Facebook, Instagram, etc.)
 */
export function generateOrganizationJsonLd(urlBase, socialUrls = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: urlBase,
    logo: `${urlBase}/assets/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+506-8974-5370',
      availableLanguage: ['Spanish'],
    },
    sameAs: socialUrls,
  }
}
