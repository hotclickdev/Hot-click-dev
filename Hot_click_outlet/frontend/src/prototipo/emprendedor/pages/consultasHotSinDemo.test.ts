import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Consultas con Hot (NP-7/NP-8)', () => {
  it('no muestra productos ni montos de demo', () => {
    const src = readFileSync(new URL('./ConsultasHotPage.tsx', import.meta.url), 'utf8')
    expect(src).not.toMatch(/Auriculares|₡145\.000|₡320\.000|Cargador USB-C/)
  })
})
