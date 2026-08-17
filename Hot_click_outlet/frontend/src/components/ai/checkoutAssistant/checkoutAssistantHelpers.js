export function clasificarError(code) {
  const leve = ['card_declined', 'insufficient_funds', 'expired_card', 'incorrect_cvc', 'do_not_honor']
  return leve.some(e => code?.toLowerCase().includes(e)) ? 'leve' : 'sistema'
}

export function buildInitialMessages(tipo, numeroPedido, metodoPago, errorCode, usuarioDatos) {
  if (tipo === 'success') {
    const datosConocidos = []
    if (usuarioDatos.nombre)    datosConocidos.push(`nombre: ${usuarioDatos.nombre}`)
    if (usuarioDatos.telefono)  datosConocidos.push(`teléfono: ${usuarioDatos.telefono}`)
    if (usuarioDatos.direccion) datosConocidos.push(`dirección: ${usuarioDatos.direccion}`)
    const mensajeInicial = '¡Tu compra fue exitosa! 🎉 Para coordinar la entrega, necesito confirmar algunos datos tuyos.'
    const autoQuery = datosConocidos.length > 0
      ? `Mi pedido es el #${numeroPedido}. Mis datos son: ${datosConocidos.join(', ')}. ¿Están correctos y qué sigue?`
      : `Mi pedido es el #${numeroPedido} pagado con ${metodoPago}. ¿Qué datos necesitás para la entrega?`
    return { mensajeInicial, autoQuery }
  }
  const tipoError = clasificarError(errorCode)
  if (tipoError === 'leve') {
    return {
      mensajeInicial: 'Hubo un problema con tu método de pago. No te preocupés, tu carrito sigue intacto.',
      autoQuery: 'Tuve un problema al pagar. ¿Qué opciones tengo?',
    }
  }
  const numPedidoStr = numeroPedido ? ` #${numeroPedido}` : ''
  return {
    mensajeInicial: 'Ocurrió un inconveniente en el proceso. Tu pedido quedó registrado como pendiente y nos pondremos en contacto.',
    autoQuery: `Tuve un problema al completar mi pedido${numPedidoStr}. ¿Qué sigue?`,
  }
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.55)',
          animation: 'hc-dot 1.1s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </span>
  )
}
