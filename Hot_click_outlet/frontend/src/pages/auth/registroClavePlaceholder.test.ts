import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import es from '@/i18n/locales/es.json'

describe('BAJO área 9: placeholder de contraseña en /registro', () => {
  it('el placeholder es corto y la regla completa va como ayuda visible', () => {
    const r = (es as { register: { passwordPlaceholder: string; minChars: string } }).register
    expect(r.passwordPlaceholder.length).toBeLessThanOrEqual(22)
    expect(r.minChars).toContain('mayúscula')
    const src = readFileSync(resolve(__dirname, 'RegisterFormStep.tsx'), 'utf8')
    expect(src).toContain("placeholder={t('register.passwordPlaceholder')}")
    expect(src).toContain('id="registro-clave-regla"')
  })
})
