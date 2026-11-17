import { capturarTokenDeUrl } from '@/utils/invitacionToken'

// Efecto al importar, y debe ser el PRIMER import de main.tsx: antes de que arranquen PostHog, GA4, Clarity o Sentry,
// el token de invitación sale de la barra de direcciones (queda en memoria; la URL pasa a /equipo/invitacion).
capturarTokenDeUrl()
