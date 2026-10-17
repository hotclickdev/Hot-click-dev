/** #207: sin plazo configurado `reservadoHasta` es null y la pantalla no muestra ningún plazo (decisión del dueño, S4-03). */

export const TEXTOS_PAGO_PENDIENTE = {
  titulo: 'Pago pendiente',
  verificando: 'ONVO está verificando tu SINPE Móvil. Tu pedido queda reservado mientras tanto.',
  vencidoTitulo: 'Venció el plazo y ONVO no confirmó el pago.',
  vencidoTexto: 'No se hizo ningún cobro. Tus productos siguen en el carrito.',
  confirmado: '¡Listo! ONVO confirmó tu pago.',
  enlaceInvalido: 'No encontramos un pedido con este enlace.',
  reintentando: 'No pudimos consultar tu pago. Probamos de nuevo en unos segundos.',
}

export function textoAvisoCorreo(correo: string | null): string {
  return correo ? `a ${correo} apenas ONVO confirme el pago.` : 'apenas ONVO confirme el pago.'
}

export function textoProductos(n: number): string {
  return n === 1 ? '1 producto' : `${n} productos`
}

/** «16 oct 2026, 9:40 p. m.» en hora de Costa Rica, a partir del ISO con zona que manda el backend. */
export function textoReservadoHasta(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(d)
}
