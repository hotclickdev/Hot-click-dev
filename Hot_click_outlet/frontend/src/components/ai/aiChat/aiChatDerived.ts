import type { AiChatMensaje } from './aiChatHelpers'

type DeriveAiChatViewArgs = {
  mensajes: AiChatMensaje[]
  chips: string[]
  cargando: boolean
  context: string
  userName: string | null
  productoId?: string | number | null
}

/**
 * Chips, alternativas y saludo derivados del estado del chat.
 */
export function deriveAiChatView({ mensajes, chips, cargando, context, userName, productoId = null }: DeriveAiChatViewArgs) {
  const userMsgCount    = mensajes.filter(m => m.rol === 'user').length
  const lastAssistant   = [...mensajes].reverse().find(m => m.rol === 'assistant' && !m.typing)
  const lastUserMsg     = [...mensajes].reverse().find(m => m.rol === 'user')
  const startChips      = (chips ?? []).slice(0, 3)
  const showChips       = userMsgCount === 0 && startChips.length > 0 && !cargando
  const activeChips     = startChips

  const productoNombreCtx = context.startsWith('PRODUCTO:')
    ? context.split(':')[1] ?? null : null

  const showAlternativas =
    !productoId &&
    !cargando &&
    userMsgCount >= 3 &&
    lastAssistant != null &&
    (lastAssistant.productos?.length ?? 0) === 0 &&
    lastUserMsg != null

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
