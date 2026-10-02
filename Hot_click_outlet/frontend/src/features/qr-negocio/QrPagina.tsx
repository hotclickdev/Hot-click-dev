import type { ReactNode } from 'react'

/**
 * Marco de las pantallas públicas por QR (mesa y pago): columna móvil de 390
 * sobre el fondo n/50 de Figma. No hay frames de escritorio: se centra la
 * misma columna. Lleva `hc-figma-ui`: sin `MainLayout`, la regla de 16 px de
 * `index.css` agrandaba el buscador en móvil (Figma pide 14).
 */
export default function QrPagina({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="hc-figma-ui min-h-dvh bg-hc-n-50">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-hc-n-50">
        {children}
      </main>
    </div>
  )
}
