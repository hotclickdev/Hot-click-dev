const PLANES = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS'] as const

export type PlanTienda = (typeof PLANES)[number]

export function esPlanTienda(valor: string): valor is PlanTienda {
  return (PLANES as readonly string[]).includes(valor)
}

export function nombrePlan(plan: string): string {
  if (plan === 'NEGOCIO_PLUS') return 'Negocio Plus'
  if (plan === 'EMPRENDEDOR') return 'Emprendedor'
  return 'PYME'
}

/** La persona entra a Tu Plan del plan que ya tiene. El destino va en la consulta. */
export function rutaSuscripcion(planActual: string, planDestino: string): string {
  const actual = planActual.toUpperCase()
  const destino = planDestino.toUpperCase()
  const base = actual === 'PYME'
    ? '/pyme/plan'
    : actual === 'NEGOCIO_PLUS'
      ? '/negocio-plus/plan'
      : '/emprendedor/opciones/plan'
  return `${base}?plan=${encodeURIComponent(destino)}`
}

export function enlaceSuscripcion(planActual: string, planDestino: string): string {
  const ruta = rutaSuscripcion(planActual, planDestino)
  if (typeof window === 'undefined') return ruta
  return `${window.location.origin}${ruta}`
}

export function mensajeSuscripcion(negocio: string, planDestino: string, url: string): string {
  const plan = nombrePlan(planDestino.toUpperCase())
  const paso = planDestino.toUpperCase() === 'EMPRENDEDOR'
    ? 'entrá y confirmá el cambio'
    : 'entrá y registrá la tarjeta'
  return `Hola, soy de HotClick. El plan de ${negocio} pasa a ${plan}. Por protocolo, ${paso} aquí: ${url}`
}
