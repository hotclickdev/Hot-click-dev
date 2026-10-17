export const PLAZO_POR_CONFIRMAR = 'plazo según ONVO (por confirmar)'

export const TEXTOS_PAGO_PENDIENTE = {
  titulo: 'Pago pendiente',
  verificando: 'ONVO está verificando tu SINPE Móvil. Tu pedido queda reservado mientras tanto.',
  vencidoTitulo: 'Venció el plazo y ONVO no confirmó el pago.',
  vencidoTexto: 'No se hizo ningún cobro. Tus productos siguen en el carrito.',
  confirmado: '¡Listo! ONVO confirmó tu pago.',
}

export function textoAvisoCorreo(correo: string | null): string {
  return correo ? `a ${correo} apenas ONVO confirme el pago.` : 'apenas ONVO confirme el pago.'
}

export function textoProductos(n: number): string {
  return n === 1 ? '1 producto' : `${n} productos`
}
