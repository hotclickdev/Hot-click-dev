type FotoEmprende = {
  local: string
  fallback: string
  altKey: string
}

/** Fotos de comercios: archivo local primero, Unsplash de respaldo. */
export const FOTOS_EMPRENDE = {
  local: {
    local: '/emprende/local.jpg',
    fallback: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    altKey: 'emprende.fotoLocalAlt',
  },
  caja: {
    local: '/emprende/caja.jpg',
    fallback: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&q=80',
    altKey: 'emprende.fotoCajaAlt',
  },
  tienda: {
    local: '/emprende/tienda.jpg',
    fallback: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80',
    altKey: 'emprende.fotoTiendaAlt',
  },
  cafe: {
    local: '/emprende/cafe.jpg',
    fallback: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
    altKey: 'emprende.fotoCafeAlt',
  },
  mercado: {
    local: '/emprende/mercado.jpg',
    fallback: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80',
    altKey: 'emprende.fotoMercadoAlt',
  },
  registro: {
    local: '/emprende/registro.jpg',
    fallback: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    altKey: 'emprende.fotoRegistroAlt',
  },
} as const satisfies Record<string, FotoEmprende>

export const FOTOS_GALERIA: readonly FotoEmprende[] = [
  FOTOS_EMPRENDE.local,
  FOTOS_EMPRENDE.caja,
  FOTOS_EMPRENDE.tienda,
  FOTOS_EMPRENDE.cafe,
]

export const FOTOS_PROCESO: readonly FotoEmprende[] = [
  FOTOS_EMPRENDE.registro,
  FOTOS_EMPRENDE.tienda,
  FOTOS_EMPRENDE.caja,
]
