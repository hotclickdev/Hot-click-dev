import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const leer = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
const PAGINAS = ['./NotificacionesPage.tsx', '../../compartido/NotificacionesPage.tsx']
const MOCKS = ['Auriculares', 'Camiseta Oversize', 'Cargador USB-C', 'Falló tu cobro mensual', 'Tu negocio fue aprobado', '₡19.800']

describe('Notificaciones sin datos de ejemplo', () => {
  it.each(PAGINAS)('%s muestra el estado vacío y ningún aviso inventado', (rel) => {
    const src = leer(rel)
    expect(src).toContain('EstadoVacioConversacional')
    for (const m of MOCKS) expect(src).not.toContain(m)
  })
})
