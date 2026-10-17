import { describe, expect, it } from 'vitest'
import { beforeBreadcrumb, beforeSendTransaction } from './sentryClient'

const TOKEN = 'b'.repeat(64)

describe('Sentry sin tokens de pedido', () => {
  it('breadcrumb de navegación sin ?token=', () => {
    const b = beforeBreadcrumb({ category: 'navigation', data: { from: '/checkout', to: `/checkout/pendiente/ORD-1?token=${TOKEN}` } })
    expect(b?.data?.to).toBe('/checkout/pendiente/ORD-1')
    expect(JSON.stringify(b)).not.toContain(TOKEN)
  })

  it('transacción sin token en request.url', () => {
    const t = beforeSendTransaction({ transaction: '/checkout/pendiente/:numero', request: { url: `https://hotclick.lat/checkout/pendiente/ORD-1?token=${TOKEN}` } })
    expect(t.request.url).toBe('https://hotclick.lat/checkout/pendiente/ORD-1')
  })
})
