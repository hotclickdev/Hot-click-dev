import { create } from 'zustand'
import api from '@/services/api'

/**
 * Store de información del tenant activo (plan, límites, features).
 *
 * Se carga desde /api/tenant/info al montar AdminLayout.
 * Se limpia en logout.
 *
 * Uso:
 *   const { plan, hasFeature, isAtLimit } = useTenantStore()
 */
const useTenantStore = create((set, get) => ({
  // Plan
  planNombre:   'FREE',
  planId:       null,
  estadoPlan:   'ACTIVO',
  trialDias:    -1,
  fechaVenc:    null,
  timezone:     'America/Costa_Rica',

  // Límites del plan
  maxUsuarios:  2,
  maxProductos: 50,
  maxBodegas:   1,
  maxCajas:     1,

  // Features habilitadas para este plan
  features: {
    pos:      false,
    crm:      false,
    compras:  false,
    reportes: false,
    ai:       false,
    api:      false,
  },

  // Uso actual (cargado por separado)
  usoProductos: 0,
  usoUsuarios:  0,

  loaded: false,
  loading: false,

  estadoEmpresa: null,
  visibilidadPublica: null,

  // ── Acciones ─────────────────────────────────────────────────────────────

  loadTenantInfo: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const { data } = await api.get('/tenant/info')
      set({
        planNombre:   data.planNombre   ?? 'FREE',
        planId:       data.planId       ?? null,
        estadoPlan:   data.estadoPlan   ?? 'ACTIVO',
        trialDias:    data.trialDias    ?? -1,
        fechaVenc:    data.fechaVenc    ?? null,
        timezone:     data.timezone     ?? 'America/Costa_Rica',
        maxUsuarios:  data.maxUsuarios  ?? 2,
        maxProductos: data.maxProductos ?? 50,
        maxBodegas:   data.maxBodegas   ?? 1,
        maxCajas:     data.maxCajas     ?? 1,
        features:     data.features     ?? {},
        loaded: true,
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  loadTenantUso: async () => {
    try {
      const { data } = await api.get('/tenant/uso')
      set({ usoProductos: data.productos ?? 0, usoUsuarios: data.usuarios ?? 0 })
    } catch { /* silencioso */ }
  },

  setEmpresaStatus: ({ estadoEmpresa, visibilidadPublica }) => set({
    estadoEmpresa: estadoEmpresa ?? null,
    visibilidadPublica: visibilidadPublica === true,
  }),

  /**
   * Verifica si el plan activo incluye una feature.
   * Ejemplo: hasFeature('pos'), hasFeature('ai')
   */
  hasFeature: (feature) => {
    const { features, planNombre } = get()
    if (planNombre === 'ADMIN') return true
    return !!features[feature]
  },

  /**
   * Verifica si el uso actual alcanzó el límite del plan.
   * Ejemplo: isAtLimit('productos') → true si usoProductos >= maxProductos
   */
  isAtLimit: (entidad) => {
    const state = get()
    const limites = {
      productos: { uso: state.usoProductos, max: state.maxProductos },
      usuarios:  { uso: state.usoUsuarios,  max: state.maxUsuarios  },
    }
    const entry = limites[entidad]
    if (!entry) return false
    if (entry.max === -1) return false  // ilimitado
    return entry.uso >= entry.max
  },

  /**
   * Porcentaje de uso de una entidad (0–100). -1 si es ilimitado.
   */
  usoPorcentaje: (entidad) => {
    const state = get()
    const limites = {
      productos: { uso: state.usoProductos, max: state.maxProductos },
      usuarios:  { uso: state.usoUsuarios,  max: state.maxUsuarios  },
    }
    const entry = limites[entidad]
    if (!entry || entry.max === -1) return -1
    return Math.min(100, Math.round((entry.uso / entry.max) * 100))
  },

  clear: () => set({
    planNombre: 'FREE', planId: null, estadoPlan: 'ACTIVO',
    trialDias: -1, fechaVenc: null, features: {},
    usoProductos: 0, usoUsuarios: 0,
    loaded: false, loading: false,
    estadoEmpresa: null, visibilidadPublica: null,
  }),
}))

export default useTenantStore
