import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Estado global de la tienda pública (/tienda/{slug}).
 *
 * - `empresa`: metadatos del emprendedor (nombre, colores, logo, etc.)
 * - `carrito`: ítems aislados de esta tienda (separados del cartStore de HOTCLICK)
 *
 * El carrito se persiste en localStorage bajo la key `tienda-carrito` pero
 * se resetea automáticamente cuando el slug cambia, garantizando aislamiento.
 */

const useTiendaStore = create(
  persist(
    (set, get) => ({
      // ── Empresa activa ───────────────────────────────────────────────────────
      slug:    null,
      empresa: null,   // { slug, nombreComercial, logoUrl, colorPrimario, colorSecundario, colorAcento, tagline, whatsapp, moneda }

      setEmpresa: (slug, data) => {
        // Si el slug cambió, limpia el carrito del slug anterior
        if (get().slug && get().slug !== slug) {
          set({ slug, empresa: data, carrito: [] })
        } else {
          set({ slug, empresa: data })
        }
      },

      clearEmpresa: () => set({ slug: null, empresa: null, carrito: [] }),

      // ── Carrito de la tienda ─────────────────────────────────────────────────
      carrito: [],  // [{ producto, cantidad }]

      agregarAlCarrito: (producto, cantidad = 1) => {
        const carrito = get().carrito
        const existente = carrito.find(i => i.producto.id === producto.id)
        if (existente) {
          set({
            carrito: carrito.map(i =>
              i.producto.id === producto.id
                ? { ...i, cantidad: i.cantidad + cantidad }
                : i
            ),
          })
        } else {
          set({ carrito: [...carrito, { producto, cantidad }] })
        }
      },

      quitarDelCarrito: (productoId) =>
        set({ carrito: get().carrito.filter(i => i.producto.id !== productoId) }),

      actualizarCantidad: (productoId, cantidad) => {
        if (cantidad <= 0) {
          get().quitarDelCarrito(productoId)
          return
        }
        set({
          carrito: get().carrito.map(i =>
            i.producto.id === productoId ? { ...i, cantidad } : i
          ),
        })
      },

      vaciarCarrito: () => set({ carrito: [] }),

      // ── Getters derivados ────────────────────────────────────────────────────
      totalItems:   () => get().carrito.reduce((s, i) => s + i.cantidad, 0),
      totalImporte: () => get().carrito.reduce((s, i) => s + (i.producto.precio ?? 0) * i.cantidad, 0),

      itemsParaPedido: () =>
        get().carrito.map(i => ({ productoId: i.producto.id, cantidad: i.cantidad })),
    }),
    {
      name: 'tienda-carrito',
      partialize: (state) => ({
        slug:    state.slug,
        empresa: state.empresa,
        carrito: state.carrito,
      }),
    }
  )
)

export default useTiendaStore
