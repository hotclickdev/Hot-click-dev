import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CONVERSACION } from '../emprendedor/pages/ConsultasHotPage'

describe('S1-22 Asistente Hot sin conversación de demo (NP-7, NP-8)', () => {
  it('el Asistente Hot de Pyme/Negocio Plus no trae montos ni productos de demo', () => {
    const src = readFileSync(fileURLToPath(new URL('./ConsultasPage.tsx', import.meta.url)), 'utf8')
    expect(src).not.toMatch(/₡\s?\d|Auriculares|Cargador USB-C/)
    expect(src).toContain('CONVERSACION')
  })

  it('la conversación inicial es solo el saludo del bot', () => {
    expect(CONVERSACION).toHaveLength(1)
    expect(CONVERSACION[0].de).toBe('bot')
    expect(CONVERSACION[0].texto).not.toMatch(/₡/)
  })

  it('Notificaciones de Pyme/Negocio Plus no tiene avisos de ejemplo', () => {
    const src = readFileSync(fileURLToPath(new URL('./NotificacionesPage.tsx', import.meta.url)), 'utf8')
    expect(src).not.toMatch(/₡\s?\d/)
    expect(src).toContain('EstadoVacioConversacional')
  })
})
