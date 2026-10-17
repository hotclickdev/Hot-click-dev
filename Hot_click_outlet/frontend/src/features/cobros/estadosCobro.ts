import type { EstadoCobro } from './cobrosOnvoApi'

/** Textos y colores de la lámina S2-25 (activar-cobros-390-estados). Color y texto siempre juntos. */
export type Tono = 'neutro' | 'amarillo' | 'azul' | 'verde' | 'rojo'

export type VistaEstado = {
  etiqueta: string
  tono: Tono
  mensaje: string
  caja: 'info' | 'ok' | 'mal'
  /** Paso actual del checklist (0..3); 4 = todos hechos. */
  paso: number
  cta: 'activar' | 'continuar' | null
  secundaria: 'reenviar' | 'soporte' | 'ir-onvo' | null
  conFrecuencia: boolean
  conPrivacidad: boolean
  /** S3-23: título del aviso, qué puede hacer el vendedor y quién lo decidió. */
  titulo?: string
  queHacer?: string
  quien?: 'ONVO' | 'HotClick'
}

export const PASOS_COBRO = [
  { titulo: 'Crear tu cuenta en ONVO', detalle: 'HotClick te registra y te manda un enlace.' },
  { titulo: 'Completar el formulario de ONVO', detalle: 'Identidad y cuenta bancaria (IBAN), en la página de ONVO.' },
  { titulo: 'Revisión de ONVO', detalle: 'ONVO revisa tus datos y te avisa.' },
  { titulo: 'Cobros activos', detalle: 'Recibís pagos con tarjeta, y SINPE Móvil dentro de ONVO.' },
] as const

export const TEXTO_PRIVACIDAD = 'El formulario de identidad (KYC) es de ONVO. Tu IBAN solo lo ven vos y el equipo de HotClick para hacerte los pagos.'

export const VISTAS_ESTADO: Record<EstadoCobro, VistaEstado> = {
  SIN_CUENTA: { etiqueta: 'Sin cuenta', tono: 'neutro', mensaje: 'Activá tus cobros para vender con pago en línea.', caja: 'info', paso: 0, cta: 'activar', secundaria: null, conFrecuencia: false, conPrivacidad: true },
  ONBOARDING_PENDIENTE: { etiqueta: 'Onboarding pendiente', tono: 'amarillo', mensaje: 'Te mandamos el enlace de ONVO a tu correo. Completá el formulario para seguir.', caja: 'info', paso: 1, cta: 'continuar', secundaria: 'reenviar', conFrecuencia: true, conPrivacidad: true },
  EN_REVISION: { etiqueta: 'En revisión', tono: 'azul', titulo: 'ONVO está revisando tus datos.', mensaje: 'Te avisamos por correo cuando termine. Mientras tanto tus clientes pueden pagar contra entrega si la tenés activa.', caja: 'info', paso: 2, cta: null, secundaria: 'soporte', conFrecuencia: true, conPrivacidad: true, queHacer: 'Nada por ahora; no hace falta que nos escribas.', quien: 'ONVO' },
  ACTIVA: { etiqueta: 'Activa', tono: 'verde', mensaje: 'Ya recibís pagos en línea. ONVO te deposita según la frecuencia elegida.', caja: 'ok', paso: 4, cta: null, secundaria: null, conFrecuencia: true, conPrivacidad: false },
  PAUSADA: { etiqueta: 'Pausada por HotClick', tono: 'amarillo', titulo: 'HotClick pausó tus cobros en línea.', mensaje: 'Cuando lo resolvamos juntos, los reactivamos.', caja: 'info', paso: 4, cta: null, secundaria: 'soporte', conFrecuencia: true, conPrivacidad: false, queHacer: 'Escribile a soporte de HotClick. Te respondemos en tu correo.', quien: 'HotClick' },
  SUSPENDIDA: { etiqueta: 'Suspendida por ONVO', tono: 'rojo', titulo: 'ONVO suspendió tu cuenta de cobros.', mensaje: 'No podés recibir pagos en línea. Escribinos y te ayudamos a resolverlo con ONVO.', caja: 'mal', paso: 4, cta: null, secundaria: 'soporte', conFrecuencia: false, conPrivacidad: false, queHacer: 'Escribile a soporte de HotClick. Te respondemos en tu correo.', quien: 'ONVO' },
}

/** S3-23: la suspensión no muestra datos internos de ONVO (reemplaza el «Ir a ONVO» de S2-25). */
export const DETALLE_SUSPENDIDA = null

/** Motivo que escribió el admin al pausar (S3-22) y desde cuándo. */
export function detallePausada(fecha: string | null, motivo: string | null = null): string | null {
  const partes = [motivo ? `Motivo: «${motivo}».` : null, fecha ? `Desde el ${fecha}.` : null].filter(Boolean)
  return partes.length ? partes.join(' ') : null
}

/** Solo los US$3 por liquidación están decididos (S2-28); la comisión de ONVO no se muestra. */
export function textoFrecuencia(f: 'QUINCENAL' | 'MENSUAL'): { titulo: string; detalle: string } {
  return f === 'QUINCENAL'
    ? { titulo: 'Quincenal · US$3 por liquidación', detalle: 'US$3 cada 15 días (2 por mes). ONVO lo descuenta de cada depósito.' }
    : { titulo: 'Mensual · US$3 por liquidación', detalle: 'US$3 al mes. ONVO lo descuenta de cada depósito.' }
}
