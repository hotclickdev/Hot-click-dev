import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser'
import api from './api'

export const webAuthnService = {
  // ── Registro (desde panel admin) ─────────────────────────────────────────

  async registerKey(deviceName = 'Llave de seguridad') {
    // 1. Obtener opciones del servidor
    const { data } = await api.post<{ options: string }>('/auth/webauthn/register/start', { deviceName })
    const options = JSON.parse(data.options) as PublicKeyCredentialCreationOptionsJSON

    // 2. Activar el autenticador (browser API)
    const credential = await startRegistration({ optionsJSON: options })

    // 3. Enviar resultado al servidor
    await api.post('/auth/webauthn/register/finish', {
      response: JSON.stringify(credential),
      deviceName,
    })
  },

  // ── Autenticación (paso 2 del login ADMIN) ─────────────────────────────

  async authenticate(email: string) {
    // 1. Obtener challenge del servidor
    const { data } = await api.post<{ options: string }>('/auth/webauthn/login/start', { email })
    const options = JSON.parse(data.options) as PublicKeyCredentialRequestOptionsJSON

    // 2. Usar la llave de seguridad
    const credential = await startAuthentication({ optionsJSON: options })

    // 3. Verificar en el servidor → devuelve { token, refreshToken, ... }
    const { data: authData } = await api.post('/auth/webauthn/login/finish', {
      email,
      response: JSON.stringify(credential),
    })
    return authData
  },

  async hasCredentials() {
    const { data } = await api.get<{ hasCredentials: boolean }>('/auth/webauthn/credentials')
    return data.hasCredentials
  },
}
