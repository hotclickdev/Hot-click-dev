import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/components/descubri/specialCardIcons.tsx'),
  'utf8',
)

test('pago en Descubrí enseña cómo comprar, no WhatsApp', () => {
  expect(src).toContain("to: '/informacion'")
  expect(src).not.toContain('wa.me')
})
