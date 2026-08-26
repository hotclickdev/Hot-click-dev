export const fmt = (n) => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))

export const ALERTA_STYLE = {
  LIMITE:      { bg: 'rgba(239,68,68,0.1)',    color: '#f87171',  icono: 'alerta' },
  ADVERTENCIA: { bg: 'rgba(251,191,36,0.1)',   color: '#fbbf24',  icono: 'alerta' },
  INFO:        { bg: 'rgba(99,102,241,0.1)',   color: '#818cf8',  icono: 'idea' },
}

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
