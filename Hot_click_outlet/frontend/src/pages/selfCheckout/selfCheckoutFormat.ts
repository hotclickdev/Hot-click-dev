/** Formato de montos en colones para self-checkout. */
export const fmt = (n: number | undefined) => new Intl.NumberFormat('es-CR').format(n as number)
