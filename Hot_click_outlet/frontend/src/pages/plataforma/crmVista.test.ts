import { describe, expect, it } from 'vitest'
import { contactosDe, filtrarContactos, mensajePrevio, type Contacto } from './crmVista'

const filas: Contacto[] = [
  { empresaId: '1', persona: 'Ana Solís', correo: 'ana@taller.test', negocio: 'Ana', telefono: '88880000', estado: 'Activo', enProceso: false, genera: 1000, pagado: 1000, pendiente: 0 },
  { empresaId: '2', persona: 'Sin nombre todavía', correo: '', negocio: 'Taller', telefono: '', estado: 'En proceso', enProceso: true, genera: 0, pagado: 0, pendiente: 0 },
  { empresaId: '3', persona: 'Luis Mora', correo: 'luis@taller.test', negocio: 'Luis', telefono: '88881111', estado: 'Activo', enProceso: false, genera: 9000, pagado: 9000, pendiente: 0 },
]

describe('crm de la consola', () => {
  it('ordena por lo que generan y separa a quien sigue en proceso', () => {
    expect(filtrarContactos(filas, 'genera').map((fila) => fila.empresaId)).toEqual(['3', '1', '2'])
    expect(filtrarContactos(filas, 'proceso').map((fila) => fila.negocio)).toEqual(['Taller'])
    expect(filtrarContactos(filas, 'activos')).toHaveLength(2)
  })

  it('el mensaje previo saluda por el negocio y distingue al que aún no entra', () => {
    expect(mensajePrevio('Ana Solís', 'Ana', false)).toContain('Te escribo por Ana')
    expect(mensajePrevio('Sin nombre todavía', 'Taller', true)).toContain('en proceso de inscripción')
  })

  it('QA-131-3: separa pagado de pendiente (dato real del backend) y ordena por lo pagado', () => {
    const [c] = contactosDe([{ empresaId: 7, persona: 'Q', negocio: 'Café', genera: 25500, pagado: 17000, pendiente: 8500 }])
    expect(c.pagado).toBe(17000)
    expect(c.pendiente).toBe(8500)
    const [sinDato] = contactosDe([{ empresaId: 8, negocio: 'X' }])
    expect([sinDato.pagado, sinDato.pendiente]).toEqual([0, 0])
    const orden = filtrarContactos([
      { ...filas[0], empresaId: 'a', pagado: 100, pendiente: 99999 },
      { ...filas[0], empresaId: 'b', pagado: 500, pendiente: 0 },
    ], 'genera').map((f) => f.empresaId)
    expect(orden).toEqual(['b', 'a'])
  })
})
