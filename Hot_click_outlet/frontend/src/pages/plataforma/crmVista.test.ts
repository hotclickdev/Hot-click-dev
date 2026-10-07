import { describe, expect, it } from 'vitest'
import { filtrarContactos, mensajePrevio, type Contacto } from './crmVista'

const filas: Contacto[] = [
  { empresaId: '1', persona: 'Ana Solís', correo: 'ana@taller.test', negocio: 'Ana', telefono: '88880000', estado: 'Activo', enProceso: false, genera: 1000 },
  { empresaId: '2', persona: 'Sin nombre todavía', correo: '', negocio: 'Taller', telefono: '', estado: 'En proceso', enProceso: true, genera: 0 },
  { empresaId: '3', persona: 'Luis Mora', correo: 'luis@taller.test', negocio: 'Luis', telefono: '88881111', estado: 'Activo', enProceso: false, genera: 9000 },
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
})