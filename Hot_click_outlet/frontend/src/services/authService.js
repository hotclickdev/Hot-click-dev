import api from './api'

export const authService = {
  login: (correo, contrasena) =>
    api.post('/auth/login', { correo, contrasena }),

  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken) =>
    api.post('/auth/logout', { refreshToken }),

  verify2FA: (tempToken, code, recoveryCode) => {
    const body = { tempToken }
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
}
