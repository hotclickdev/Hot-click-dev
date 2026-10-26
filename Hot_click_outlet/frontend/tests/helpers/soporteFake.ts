/**
 * Teléfono de soporte FICTICIO para e2e. playwright.config.ts lo inyecta como
 * VITE_SOPORTE_TELEFONO solo en el webServer de Vite (dev); no toca el build de static/.
 */
export const SOPORTE_TELEFONO_FAKE = '+000 0000 0000'
/** Dígitos que arma la app para wa.me (11 dígitos ⇒ sin código de país extra). */
export const SOPORTE_WA_FAKE = '00000000000'
/** Número ficticio de vendedor para mocks (dígito repetido). */
export const VENDEDOR_WA_FAKE = '50688888888'
