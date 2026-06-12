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
}
