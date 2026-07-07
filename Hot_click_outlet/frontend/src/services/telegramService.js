import api from './api'

/**
 * Vinculación del bot de Telegram (Configuración → Telegram).
 * El flujo es por deep link: el backend genera un código de un solo uso (10 min)
 * y el usuario abre t.me/{bot}?start={codigo} — Telegram no permite que un bot
 * escriba a un número de teléfono, siempre inicia el usuario.
 */
export const telegramService = {
  /** Genera código + deep link para vincular el Telegram del usuario actual */
  vincular: () =>
    api.post('/telegram/vincular'),

  /** Estado de la vinculación propia { configurado, vinculado, telegramUsername, ... } */
  estado: () =>
    api.get('/telegram/estado'),

  /** Revoca la vinculación propia */
  desvincular: () =>
    api.delete('/telegram/vincular'),

  /** Miembros del equipo con Telegram vinculado (solo PROPIETARIO/ADMIN) */
  equipo: () =>
    api.get('/telegram/equipo'),

  /** Revoca la vinculación de un miembro del equipo (solo PROPIETARIO/ADMIN) */
  revocarMiembro: (usuarioId) =>
    api.delete(`/telegram/equipo/${usuarioId}`),
}
