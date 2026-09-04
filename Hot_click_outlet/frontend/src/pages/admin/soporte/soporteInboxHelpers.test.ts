import { describe, expect, it } from 'vitest'
import {
  filtrarTicketsLocales,
  puedeAsignarTicket,
  puedeResolverTicket,
  ticketsDesdeRespuesta,
} from './soporteInboxHelpers'
import type { TicketSoporteItem } from '@/services/soporteService'

function ticket(partial: Partial<TicketSoporteItem> & Pick<TicketSoporteItem, 'id' | 'estado'>): TicketSoporteItem {
  return {
    titulo: 'Ayuda',
    descripcion: 'Detalle',
    ...partial,
  }
}

describe('soporteInboxHelpers', () => {
  it('extrae lista desde ResponseDTO o array', () => {
    expect(ticketsDesdeRespuesta([{ id: 1, titulo: 'A', descripcion: 'd', estado: 'ABIERTO' }])).toHaveLength(1)
    expect(ticketsDesdeRespuesta({ data: [ticket({ id: 2, estado: 'ASIGNADO' })] })).toHaveLength(1)
    expect(ticketsDesdeRespuesta(null)).toEqual([])
  })

  it('filtra por estado en cliente', () => {
    const lista = [
      ticket({ id: 1, estado: 'ABIERTO' }),
      ticket({ id: 2, estado: 'RESUELTO' }),
    ]
    expect(filtrarTicketsLocales(lista, 'ABIERTO')).toHaveLength(1)
    expect(filtrarTicketsLocales(lista, 'ALL')).toHaveLength(2)
  })

  it('acciones solo sobre abiertos/asignados', () => {
    expect(puedeAsignarTicket('ABIERTO')).toBe(true)
    expect(puedeResolverTicket('ASIGNADO')).toBe(true)
    expect(puedeAsignarTicket('RESUELTO')).toBe(false)
    expect(puedeResolverTicket('RESUELTO')).toBe(false)
  })
})
