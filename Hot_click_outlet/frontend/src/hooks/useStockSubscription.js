import { useEffect, useRef } from 'react'

/**
 * Suscripción SSE a cambios de stock de un producto puntual.
 *
 * Backend: GET /api/marketplace/productos/{idProducto}/stock-stream (público, sin JWT —
 * EventSource nativo no puede mandar Authorization header). El servidor infiere la
 * empresa desde el producto y nunca filtra por la del caller; `empresaId` aquí solo
 * se reenvía al callback para que el consumidor pueda escribir en su store con la
 * clave compuesta empresa+producto si la necesita.
 *
 * Evento emitido por el backend: "stock" con payload { id_producto, stock_actual }.
 *
 * onStockUpdate(idProducto, nuevoStock, empresaId) se invoca en cada actualización
 * (incluyendo el snapshot inicial que el backend manda al conectar).
 */
export function useStockSubscription(idProducto, empresaId, onStockUpdate) {
  const onStockUpdateRef = useRef(onStockUpdate)
  onStockUpdateRef.current = onStockUpdate

  useEffect(() => {
    if (!idProducto) return

    const eventSource = new EventSource(`/api/marketplace/productos/${idProducto}/stock-stream`)

    eventSource.addEventListener('stock', (event) => {
      try {
        const { id_producto, stock_actual } = JSON.parse(event.data)
        onStockUpdateRef.current?.(id_producto, stock_actual, empresaId)
      } catch {
        // payload inválido — se ignora, la próxima actualización corrige el estado
      }
    })

    // No cerramos en onerror: EventSource reintenta solo. Solo limpiamos al desmontar.
    return () => {
      eventSource.close()
    }
  }, [idProducto, empresaId])
}

export default useStockSubscription
