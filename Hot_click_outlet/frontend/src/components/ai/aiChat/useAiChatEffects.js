import { useEffect } from 'react'
import useChatStore from '@/store/chatStore'
import { persistMensajes, persistSessionSearches } from './aiChatStorage'

/**
 * Efectos de scroll, persistencia, auto-query, proactivo y exit-intent.
 */
export function useAiChatEffects({
  mensajes, storageKey, sessionKey, searchKey, sessionSearches,
  historyRef, autoQuery, autoSent, enviarDirecto,
  proactiveTrigger, proactiveSent, setProactiveSent, userName, setMensajes, cargRef,
  exitIntentEnabled, exitShown, setExitShown,
}) {
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [mensajes])

  useEffect(() => {
    persistMensajes(storageKey, mensajes)
  }, [mensajes, storageKey])

  useEffect(() => {
    if (sessionKey !== 'hotclick') return
    useChatStore.getState().setMensajes(mensajes)
  }, [mensajes, sessionKey])

  useEffect(() => {
    persistSessionSearches(searchKey, sessionSearches)
  }, [sessionSearches, searchKey])

  useEffect(() => {
    if (!autoQuery || autoSent.current) return
    autoSent.current = true
    const timer = setTimeout(() => enviarDirecto(autoQuery), 700)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!proactiveTrigger || proactiveSent || mensajes.length > 0) return
    const timer = setTimeout(() => {
      if (cargRef.current || proactiveSent) return
      setProactiveSent(true)
      const msg = userName
        ? `Hola ${userName.split(' ')[0]}, ¿encontraste lo que buscás? Puedo ayudarte.`
        : '¿Podés ayudarte a encontrar algo? Tenemos ofertas disponibles hoy.'
      setMensajes(prev => [...prev, { rol: 'assistant', texto: msg, productos: [], opts: [
        '¿Qué hay en oferta?', '¿Cuánto cuesta el envío?',
      ]}])
    }, 3 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [proactiveTrigger, proactiveSent, mensajes.length, userName])

  useEffect(() => {
    if (!exitIntentEnabled || exitShown) return
    function handleMouseLeave(e) {
      if (e.clientY > 10) return
      setExitShown(true)
      if (mensajes.length > 0 || cargRef.current) return
      setMensajes(prev => [...prev, { rol: 'assistant', texto:
        '¡Espera! ¿Encontraste lo que buscabas? Puedo ayudarte a encontrar exactamente lo que necesitás antes de irte.',
        productos: [], opts: ['¿Tenés algo en oferta?', '¿Cuánto cuesta el envío?'],
      }])
    }
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [exitIntentEnabled, exitShown, mensajes.length])
}
