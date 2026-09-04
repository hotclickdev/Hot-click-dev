/**
 * Smoke: AdminRoleSwitch remapea `/admin/bodegas` al path seller según plan.
 * Run: pnpm exec playwright test tests/seller-wizard-remap.spec.ts
 */
import { test, expect } from '@playwright/test'
import {
  entrarSeller,
  rutaBodegasDesdeAdmin,
  type PlanVendedor,
} from './seller-wizard-helpers'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const PLANES: PlanVendedor[] = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS']

test.describe('Admin → seller remap bodegas', () => {
  for (const plan of PLANES) {
    test(`/admin/bodegas → ${rutaBodegasDesdeAdmin(plan)} (${plan})`, async ({ page }) => {
      await entrarSeller(page, plan)
      await page.goto('/admin/bodegas', { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(new RegExp(`${rutaBodegasDesdeAdmin(plan).replace(/\//g, '\\/')}/?$`))
      await expect(page.getByRole('heading', { name: 'Mis Bodegas' })).toBeVisible({ timeout: 20_000 })
    })
  }
})
