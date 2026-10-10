import { texto, type Fila } from './normalizar'

export type Contacto = {
  empresaId: string
  persona: string
  correo: string
  negocio: string
  telefono: string
  estado: string
  enProceso: boolean
  genera: number
  /** QA-131-3: pedidos pagados (mismo criterio que «Total pagado» del detalle). */
  pagado: number
  /** Pedidos todavía sin cobrar (pendiente, comprobante o aprobación). Cancelados no suman. */
  pendiente: number
}

export function contactosDe(filas: Fila[]): Contacto[] {
  return filas.flatMap((fila) => {
    const empresaId = texto(fila.empresaId)
    if (!/^[1-9]\d*$/.test(empresaId)) return []
    const genera = monto(fila.genera)
    return [{
      empresaId,
      persona: texto(fila.persona, 'Sin usuario en la ficha'),
      correo: texto(fila.correo),
      negocio: texto(fila.negocio, 'Negocio'),
      telefono: texto(fila.telefono),
      estado: texto(fila.estado, 'En proceso'),
      enProceso: fila.enProceso === true,
      genera,
      pagado: monto(fila.pagado),
      pendiente: monto(fila.pendiente),
    }]
  })
}

export function filtrarContactos(filas: Contacto[], filtro: string): Contacto[] {
  const lista = filtro === 'proceso'
    ? filas.filter((fila) => fila.enProceso)
    : filtro === 'activos'
      ? filas.filter((fila) => !fila.enProceso && fila.estado === 'Activo')
      : filas
  return [...lista].sort((a, b) => b.pagado - a.pagado || b.pendiente - a.pendiente || a.negocio.localeCompare(b.negocio, 'es'))
}

export function mensajePrevio(persona: string, negocio: string, enProceso: boolean): string {
  const sinNombre = persona === 'Sin nombre todavía' || persona === 'Sin usuario en la ficha'
  const nombre = sinNombre ? '' : persona.split(' ')[0]
  const saludo = nombre ? `Hola ${nombre}, soy de HotClick.` : 'Hola, soy de HotClick.'
  if (enProceso) {
    return `${saludo} Vi que ${negocio} está en proceso de inscripción. Si te falta algo para entrar, escribime por acá.`
  }
  return `${saludo} Te escribo por ${negocio}.`
}

function monto(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}
