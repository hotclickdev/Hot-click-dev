type FotoEmprende = {
  local: string
  fallback: string
  altKey: string
}

/** Fotos de comercios y ferias: archivo local primero, Unsplash de respaldo. */
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
  feria1: {
    local: '/emprende/feria-1.jpg',
    fallback: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&q=80',
    altKey: 'emprende.fotoFeria1Alt',
  },
  feria2: {
    local: '/emprende/feria-2.jpg',
    fallback: 'https://images.unsplash.com/photo-1506483255810-1c797d702389?w=800&q=80',
    altKey: 'emprende.fotoFeria2Alt',
  },
  feria3: {
    local: '/emprende/feria-3.jpg',
    fallback: 'https://images.unsplash.com/photo-1515165562839-978bb86d3fde?w=800&q=80',
    altKey: 'emprende.fotoFeria3Alt',
  },
} as const satisfies Record<string, FotoEmprende>

export const FOTOS_GALERIA: readonly FotoEmprende[] = [
  FOTOS_EMPRENDE.local,
  FOTOS_EMPRENDE.caja,
  FOTOS_EMPRENDE.tienda,
  FOTOS_EMPRENDE.cafe,
]

export const FOTOS_FERIA: readonly FotoEmprende[] = [
  FOTOS_EMPRENDE.mercado,
  FOTOS_EMPRENDE.feria1,
  FOTOS_EMPRENDE.feria2,
  FOTOS_EMPRENDE.feria3,
]

export const FOTOS_FASES: readonly FotoEmprende[] = [
  FOTOS_EMPRENDE.feria1,
  FOTOS_EMPRENDE.registro,
  FOTOS_EMPRENDE.tienda,
  FOTOS_EMPRENDE.caja,
  FOTOS_EMPRENDE.local,
]

export const FOTOS_PROCESO: readonly FotoEmprende[] = [
  FOTOS_EMPRENDE.registro,
  FOTOS_EMPRENDE.tienda,
  FOTOS_EMPRENDE.caja,
]
