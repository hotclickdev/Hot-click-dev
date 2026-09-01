import type { ReactNode } from 'react'

/**
 * Padding del área de contenido dentro del shell Figma vendedor.
 * Las páginas reales de `/admin` traen su propio max-width; acá solo el marco.
 */
export default function SellerPagePad({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-4 md:px-6 md:py-6 lg:px-8">
      {children}
    </div>
  )
}
