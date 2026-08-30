import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const authService = {
  login: (correo: string, contrasena: string, turnstileToken?: string) =>
    api.post('/auth/login', { correo, contrasena, ...(turnstileToken ? { turnstileToken } : {}) }),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  verify2FA: (tempToken: string, code: string | undefined, recoveryCode: string | undefined, method = 'TOTP') => {
    const body: Record<string, string> = { tempToken, method }
    if (recoveryCode) body.recoveryCode = recoveryCode
    else body.code = code ?? ''
    return api.post('/auth/2fa/verify', body)
  },

  register: (data: JsonBody) =>
    api.post('/auth/register', data),

  sendVerification: (data: JsonBody) =>
    api.post('/auth/send-verification', data),

  verifyRegistration: (correo: string, codigo: string) =>
    api.post('/auth/verify-registration', { correo, codigo }),

  forgotPassword: (correo: string) =>
    api.post('/auth/forgot-password', { correo }),

  verifyCode: (correo: string, codigo: string) =>
    api.post('/auth/verify-code', { correo, codigo }),

  resetPassword: (correo: string, nuevaContrasena: string) =>
    api.post('/auth/reset-password', { correo, nuevaContrasena }),

  changePassword: (contrasenaActual: string, nuevaContrasena: string, refreshToken: string) =>
    api.post('/auth/change-password', { contrasenaActual, nuevaContrasena, refreshToken }),

  setup2FA: () =>
    api.post('/auth/2fa/setup'),

  activate2FA: (code: string) =>
    api.post('/auth/2fa/activate', { code }),

  disable2FA: (contrasena: string, code: string) =>
    api.post('/auth/2fa/disable', { contrasena, code }),

  get2FAStatus: () =>
    api.get('/auth/2fa/status'),

  regenerateRecoveryCodes: (code: string) =>
    api.post('/auth/2fa/recovery-codes/regenerate', { code }),

  registroEmpresa: (data: JsonBody) =>
    api.post('/auth/registro-empresa', data),

  misNegocios: () =>
    api.get('/auth/mis-negocios'),

  cambiarNegocio: (empresaId: Id) =>
    api.post('/auth/cambiar-negocio', { empresaId }),

  seleccionarEmpresa: (tempToken: string, empresaId: Id) =>
    api.post('/auth/seleccionar-empresa', { tempToken, empresaId }),

  nuevoNegocio: (data: JsonBody) =>
    api.post('/auth/nuevo-negocio', data),

  verificarCorreoNegocio: (correo: string, codigo: string) =>
    api.post('/auth/verificar-correo-negocio', { correo, codigo }),

  reenviarCodigoNegocio: () =>
    api.post('/auth/reenviar-codigo-negocio'),

  // ── Multi-method 2FA ──────────────────────────────────────────────────────

  /** Send EMAIL OTP during login (uses tempToken, no session required) */
  sendLoginEmailOtp: (tempToken: string) =>
    api.post('/auth/2fa/email/send', { tempToken }),

  /** Send EMAIL OTP to start enabling Email 2FA (requires session) */
  enableEmailOtp: () =>
    api.post('/auth/2fa/email/enable'),

  /** Verify OTP and activate Email 2FA */
  activateEmailOtp: (code: string) =>
    api.post('/auth/2fa/email/activate', { code }),

  /** Disable Email OTP (requires password confirmation) */
  disableEmailOtp: (contrasena: string) =>
    api.post('/auth/2fa/email/disable', { contrasena }),

  upgradeEmprendedor: (data: JsonBody) =>
    api.post('/auth/upgrade-emprendedor', data),

  registrarConsentimiento: (tipo: string) =>
    api.post('/consentimiento', { tipo }).catch((err: unknown) => {
      console.error('[authService] consentimiento', err)
    }),
}
