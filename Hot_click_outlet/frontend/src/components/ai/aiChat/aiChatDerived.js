/**
 * Chips, alternativas y saludo derivados del estado del chat.
 * @param {{ mensajes: object[], chips: string[], cargando: boolean, context: string, userName: string | null }} args
 */
export function deriveAiChatView({ mensajes, chips, cargando, context, userName }) {
  const userMsgCount    = mensajes.filter(m => m.rol === 'user').length
  const lastAssistant   = [...mensajes].reverse().find(m => m.rol === 'assistant' && !m.typing)
  const lastUserMsg     = [...mensajes].reverse().find(m => m.rol === 'user')
  const contextChips = chipsDeContexto(lastAssistant)
  const activeChips = chipsActivos(userMsgCount, chips, contextChips)
  const showChips       = activeChips.length > 0 && !cargando

  const productoNombreCtx = context.startsWith('PRODUCTO:')
    ? context.split(':')[1] ?? null : null

  const showAlternativas =
    !cargando && userMsgCount > 0 && lastAssistant != null &&
    (lastAssistant.productos?.length ?? 0) === 0 && lastUserMsg != null

  const queryAlternativas = productoNombreCtx
    ? `¿Qué productos similares o alternativos a "${productoNombreCtx}" tenés disponibles?`
    : `¿Qué productos similares o relacionados con "${lastUserMsg?.texto ?? ''}" tenés disponibles?`

  const isCarritoContext = context.startsWith('CARRITO')
  const hasProductsInLastMsg = (lastAssistant?.productos?.length ?? 0) > 0

  const greetingText = userName
    ? `¡Hola, ${userName.split(' ')[0]}! ¿En qué te puedo ayudar hoy?`
    : null

  return {
    userMsgCount,
    lastAssistant,
    showChips,
    activeChips,
    showAlternativas,
    queryAlternativas,
    isCarritoContext,
    hasProductsInLastMsg,
    greetingText,
  }
}

function chipsDeContexto(lastAssistant) {
  if (lastAssistant?.opts?.length > 0) return lastAssistant.opts
  if (lastAssistant?.categorias?.length > 0) return lastAssistant.categorias
  return null
}

function chipsActivos(userMsgCount, chips, contextChips) {
  if (userMsgCount === 0) return chips
  return contextChips ?? []
}
