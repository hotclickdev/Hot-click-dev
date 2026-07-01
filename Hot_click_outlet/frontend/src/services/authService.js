import api from './api'

export const authService = {
  login: (correo, contrasena, turnstileToken) =>
    api.post('/auth/login', { correo, contrasena, ...(turnstileToken ? { turnstileToken } : {}) }),

  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken) =>
    api.post('/auth/logout', { refreshToken }),

  verify2FA: (tempToken, code, recoveryCode, method = 'TOTP') => {
    const body = { tempToken, method }
    if (recoveryCode) body.recoveryCode = recoveryCode
    else body.code = code
    return api.post('/auth/2fa/verify', body)
  },

  register: (data) =>
    api.post('/auth/register', data),

  sendVerification: (data) =>
    api.post('/auth/send-verification', data),

  verifyRegistration: (correo, codigo) =>
    api.post('/auth/verify-registration', { correo, codigo }),

  forgotPassword: (correo) =>
    api.post('/auth/forgot-password', { correo }),

  verifyCode: (correo, codigo) =>
    api.post('/auth/verify-code', { correo, codigo }),

  resetPassword: (correo, nuevaContrasena) =>
    api.post('/auth/reset-password', { correo, nuevaContrasena }),

  changePassword: (contrasenaActual, nuevaContrasena, refreshToken) =>
    api.post('/auth/change-password', { contrasenaActual, nuevaContrasena, refreshToken }),

  setup2FA: () =>
    api.post('/auth/2fa/setup'),

  activate2FA: (code) =>
    api.post('/auth/2fa/activate', { code }),

  disable2FA: (contrasena, code) =>
    api.post('/auth/2fa/disable', { contrasena, code }),

  get2FAStatus: () =>
    api.get('/auth/2fa/status'),

  regenerateRecoveryCodes: (code) =>
    api.post('/auth/2fa/recovery-codes/regenerate', { code }),

  registroEmpresa: (data) =>
    api.post('/auth/registro-empresa', data),

  misNegocios: () =>
    api.get('/auth/mis-negocios'),

  cambiarNegocio: (empresaId) =>
    api.post('/auth/cambiar-negocio', { empresaId }),

  seleccionarEmpresa: (tempToken, empresaId) =>
    api.post('/auth/seleccionar-empresa', { tempToken, empresaId }),

  nuevoNegocio: (data) =>
    api.post('/auth/nuevo-negocio', data),

  verificarCorreoNegocio: (correo, codigo) =>
    api.post('/auth/verificar-correo-negocio', { correo, codigo }),

  reenviarCodigoNegocio: () =>
    api.post('/auth/reenviar-codigo-negocio'),

  // ── Multi-method 2FA ──────────────────────────────────────────────────────

  /** Send EMAIL OTP during login (uses tempToken, no session required) */
  sendLoginEmailOtp: (tempToken) =>
    api.post('/auth/2fa/email/send', { tempToken }),

  /** Get current 2FA status and active methods */
  get2FAStatus: () =>
    api.get('/auth/2fa/status'),

  /** Send EMAIL OTP to start enabling Email 2FA (requires session) */
  enableEmailOtp: () =>
    api.post('/auth/2fa/email/enable'),

  /** Verify OTP and activate Email 2FA */
  activateEmailOtp: (code) =>
    api.post('/auth/2fa/email/activate', { code }),

  /** Disable Email OTP (requires password confirmation) */
  disableEmailOtp: (contrasena) =>
    api.post('/auth/2fa/email/disable', { contrasena }),
}
