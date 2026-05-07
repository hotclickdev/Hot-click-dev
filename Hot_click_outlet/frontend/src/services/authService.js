import api from './api'

export const authService = {
  login: (correo, contrasena) =>
    api.post('/auth/login', { correo, contrasena }),

  verify2FA: (tempToken, code) =>
    api.post('/auth/2fa/verify', { tempToken, code }),

  register: (data) =>
    api.post('/auth/register', data),

  forgotPassword: (correo) =>
    api.post('/auth/forgot-password', { correo }),

  verifyCode: (correo, codigo) =>
    api.post('/auth/verify-code', { correo, codigo }),

  resetPassword: (correo, nuevaContrasena) =>
    api.post('/auth/reset-password', { correo, nuevaContrasena }),

  setup2FA: () =>
    api.post('/auth/2fa/setup'),

  activate2FA: (code) =>
    api.post('/auth/2fa/activate', { code }),

  disable2FA: (contrasena, code) =>
    api.post('/auth/2fa/disable', { contrasena, code }),

  get2FAStatus: () =>
    api.get('/auth/2fa/status'),
}
