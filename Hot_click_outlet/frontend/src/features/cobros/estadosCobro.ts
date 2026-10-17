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
  EN_REVISION: { etiqueta: 'En revisión', tono: 'azul', mensaje: 'ONVO está revisando tus datos. Te avisamos por correo cuando termine; no tenés que hacer nada.', caja: 'info', paso: 2, cta: null, secundaria: null, conFrecuencia: true, conPrivacidad: true },
  ACTIVA: { etiqueta: 'Activa', tono: 'verde', mensaje: 'Ya recibís pagos en línea. ONVO te deposita según la frecuencia elegida.', caja: 'ok', paso: 4, cta: null, secundaria: null, conFrecuencia: true, conPrivacidad: false },
  PAUSADA: { etiqueta: 'Pausada', tono: 'neutro', mensaje: 'Tus cobros en línea están pausados. Tus clientes solo ven contra entrega mientras tanto.', caja: 'info', paso: 4, cta: null, secundaria: 'soporte', conFrecuencia: true, conPrivacidad: false },
  SUSPENDIDA: { etiqueta: 'Suspendida', tono: 'rojo', mensaje: 'ONVO suspendió tu cuenta. No podés recibir pagos en línea.', caja: 'mal', paso: 4, cta: null, secundaria: 'ir-onvo', conFrecuencia: false, conPrivacidad: false },
}

export const DETALLE_SUSPENDIDA = 'Revisá el correo de ONVO con el motivo y respondé desde ahí.'

export function detallePausada(fecha: string | null): string {
  return fecha
    ? `Lo pausó HotClick el ${fecha}. Escribinos a soporte si tenés dudas.`
    : 'Lo pausó HotClick. Escribinos a soporte si tenés dudas.'
}

/** Solo los US$3 por liquidación están decididos (S2-28); la comisión de ONVO no se muestra. */
export function textoFrecuencia(f: 'QUINCENAL' | 'MENSUAL'): { titulo: string; detalle: string } {
  return f === 'QUINCENAL'
    ? { titulo: 'Quincenal · US$3 por liquidación', detalle: 'US$3 cada 15 días (2 por mes). ONVO lo descuenta de cada depósito.' }
    : { titulo: 'Mensual · US$3 por liquidación', detalle: 'US$3 al mes. ONVO lo descuenta de cada depósito.' }
}
