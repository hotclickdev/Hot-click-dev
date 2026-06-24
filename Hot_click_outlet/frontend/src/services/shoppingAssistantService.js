import api from './api'

const sesionKey = (slug) => `hotclick_chat_${slug}`

export const shoppingAssistantService = {
  loadSesionId(empresaSlug) {
    try { return localStorage.getItem(sesionKey(empresaSlug)) } catch { return null }
  },

  saveSesionId(empresaSlug, sesionId) {
    try {
      if (sesionId) localStorage.setItem(sesionKey(empresaSlug), sesionId)
    } catch { /* noop */ }
  },

  clearSesion(empresaSlug) {
    try { localStorage.removeItem(sesionKey(empresaSlug)) } catch { /* noop */ }
  },

  // Returns { respuesta, sesionId, productos: [{id, nombre, sku, precio, descripcionCorta, imagenUrl}] }
  // contexto opcional: "GENERAL" | "PRODUCTO:nombre:precio:desc" | "CARRITO:items:total" |
  //                    "PAGO_FALLO:codigo" | "PAGO_EXITO:metodo:numeroPedido"
  // visitorId opcional: UUID de la cookie hotclick_visitor_id para memoria persistente
  async chat({ empresaSlug, mensaje, sesionId, contexto, visitorId }) {
    const { data } = await api.post('/public/shopping-assistant/chat', {
      empresaSlug,
      mensaje,
      sesionId:  sesionId  || undefined,
      contexto:  contexto  || undefined,
      visitorId: visitorId || undefined,
    })
    return data
  },

  // Returns { analisis: { etiquetaPrincipal, categoria }, productos: [...], encontrado: boolean }
  async searchByImage({ empresaSlug, imageFile, visitorId }) {
    const formData = new FormData()
    formData.append('image', imageFile)
    formData.append('empresaSlug', empresaSlug)
    if (visitorId) formData.append('visitorId', visitorId)
    const { data } = await api.post('/public/shopping-assistant/search-by-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  // Returns { sesionId, mensajes: [{rol, texto}] }
  // Usado en page reload para re-sincronizar el historial al chatStore.
  async getHistory(sesionId) {
    if (!sesionId) return { sesionId: '', mensajes: [] }
    try {
      const { data } = await api.get(`/public/shopping-assistant/session/${sesionId}/history`)
      return data
    } catch {
      return { sesionId, mensajes: [] }
    }
  },

  // Expira la sesión en el backend (borra mensajes). Best-effort: ignora errores.
  // Llamado por chatStore cuando el temporizador de 10 min de inactividad dispara.
  async expireSession(sesionId) {
    if (!sesionId) return
    try {
      await api.delete(`/public/shopping-assistant/session/${sesionId}`)
    } catch { /* noop — best-effort */ }
  },

  // Envía feedback (1 = thumbs up, -1 = thumbs down) de un mensaje del AI.
  // Best-effort: ignora errores para no bloquear la UI.
  async feedback(sesionId, msgIndex, rating) {
    if (!sesionId) return
    try {
      await api.post('/public/shopping-assistant/feedback', { sesionId, msgIndex, rating })
    } catch { /* noop — best-effort */ }
  },
}
