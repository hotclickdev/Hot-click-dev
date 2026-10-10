import { describe, expect, it } from 'vitest'
import { coachPermitido } from '@/components/ui/mentalModel/mmRegistry'
import { sinPuntoDoble } from './sinPuntoDoble'
import es from '@/i18n/locales/es.json'

describe('QA-130-5: banner de impersonación', () => {
  it('no termina en «p. m..»', () => {
    const hora = new Date(2026, 9, 10, 15, 45).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
    const texto = (es as { impersonacion: { venceA: string } }).impersonacion.venceA.replace('{{hora}}', hora)
    expect(sinPuntoDoble(texto)).not.toMatch(/\.\.$/)
    expect(sinPuntoDoble('Vence a las 3:45 p. m..')).toBe('Vence a las 3:45 p. m.')
    expect(sinPuntoDoble('Ends at 15:45.')).toBe('Ends at 15:45.')
  })
  it('en modo soporte no se abre el coach («Empezar guías») encima del banner', () => {
    expect(coachPermitido('/emprendedor', true)).toBe(false)
    expect(coachPermitido('/emprendedor', false)).toBe(true)
  })
})
