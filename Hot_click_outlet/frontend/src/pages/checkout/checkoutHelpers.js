import { isValidEmail } from '@/utils/validators'

export const WHATSAPP = '50686667888'
export const SINPE_NUMERO = '8666-7888'
export const SINPE_TITULAR = 'Andrés Zúñiga (HotClick)'
export const BODEGA_DEFAULT = 1

export const SHIPPING_COSTS = {
  RETIRO_EN_TIENDA:       0,
  ENCOMIENDA_PROPIA:   2500,
  ENVIO_NORMAL_GAM:    4000,
  ENVIO_NORMAL_FUERA_GAM: 4000,
  ENVIO_RAPIDO:        5000,
}

/** @param {string} v */
export function formatPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length >= 5 ? `${d.slice(0, 4)}-${d.slice(4)}` : d
}

/**
 * Retiro en tienda solo si el carrito entero es de una bodega que lo permite.
 * @param {Array<{ bodegaId?: unknown, bodegaPermiteRetiro?: boolean, bodegaNombre?: string, bodegaDireccion?: string, bodegaTelefono?: string }>} items
 * @returns {{ id: unknown, nombre: string, direccion?: string, telefono?: string } | null}
 */
export function bodegaRetiroDesdeItems(items) {
  const bodegasEnCarrito = [...new Set(items.map((i) => i.bodegaId).filter((id) => id !== null && id !== undefined && id !== ''))]
  return bodegasEnCarrito.length === 1 && items.length > 0 && items.every((i) => i.bodegaPermiteRetiro)
    ? {
        id: bodegasEnCarrito[0],
        nombre: items[0].bodegaNombre || 'la tienda',
        direccion: items[0].bodegaDireccion,
        telefono: items[0].bodegaTelefono,
      }
    : null
}

/**
 * @param {{ id: unknown, nombre: string, direccion?: string, telefono?: string } | null} bodegaRetiro
 * @returns {Array<{ value: string, label: string, sub: string, precio: number, badge: string | null, badgeColor?: string, needsAddress: boolean }>}
 */
export function opcionesEnvio(bodegaRetiro) {
  return [
    ...(bodegaRetiro ? [{
      value: 'RETIRO_EN_TIENDA',
      label: `Retiro en ${bodegaRetiro.nombre}`,
      sub: [bodegaRetiro.direccion, bodegaRetiro.telefono].filter(Boolean).join(' · ') || 'Gratis · Coordinamos el punto de entrega',
      precio: 0,
      badge: null,
      needsAddress: false,
    }] : []),
    {
      value: 'ENCOMIENDA_PROPIA',
      label: 'Tu encomienda preferida',
      sub: 'Te entregamos en el punto de tu mensajero o encomienda favorita',
      precio: 2500,
      badge: null,
      needsAddress: true,
    },
    {
      value: 'ENVIO_NORMAL_GAM',
      label: 'Envío Normal — GAM',
      sub: '2–4 días hábiles · Incluye número de rastreo',
      precio: 4000,
      badge: null,
      needsAddress: true,
    },
    {
      value: 'ENVIO_NORMAL_FUERA_GAM',
      label: 'Envío Normal — Fuera de la GAM',
      sub: '3–4 días hábiles · Incluye número de rastreo',
      precio: 4000,
      badge: null,
      needsAddress: true,
    },
    {
      value: 'ENVIO_RAPIDO',
      label: 'Envío Rápido (Express)',
      sub: '30 min – 2 horas en la GAM · Pago previo obligatorio',
      precio: 5000,
      badge: 'Pago previo',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      needsAddress: true,
    },
  ]
}

/**
 * @param {string} v
 * @param {(key: string) => string} t
 */
export function validatePhone(v, t) {
  const d = v.replace(/\D/g, '')
  if (!v.trim()) return t('checkout.phoneRequired')
  if (d.length < 8) return t('checkout.phoneInvalid')
  return ''
}

/**
 * @param {string} v
 * @param {(key: string) => string} t
 */
export function validateAddress(v, t) {
  if (!v.trim()) return t('checkout.addressRequired')
  if (v.trim().length < 10) return t('checkout.addressMin')
  return ''
}

/**
 * @param {string} v
 * @param {(key: string) => string} t
 */
export function validateGuestEmail(v, t) {
  if (!v.trim()) return t('checkout.guestEmailRequired')
  if (!isValidEmail(v)) return t('checkout.guestEmailInvalid')
  return ''
}
