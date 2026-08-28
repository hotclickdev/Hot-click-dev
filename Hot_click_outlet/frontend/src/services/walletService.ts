import api from './api'
import type { JsonBody } from '@/types/api'

/** Billetera y payouts del emprendedor. */
export const walletService = {
  getSaldo: () => api.get('/wallet/saldo'),
  getTransacciones: (page: number, size = 15) =>
    api.get(`/wallet/transacciones?page=${page}&size=${size}`),
  getPayouts: (page = 0, size = 50) =>
    api.get(`/wallet/payouts?page=${page}&size=${size}`),
  solicitarPayout: (body: JsonBody) => api.post('/wallet/payout', body),
}
