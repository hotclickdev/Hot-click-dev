import type { ReactNode } from 'react'
import MainLayout from '@/layouts/MainLayout'

type CheckoutChromeProps = {
  /** Sin Navbar/Footer marketplace (bajo VisitanteShell u otro shell). */
  embedido?: boolean
  children: ReactNode
}

/**
 * MainLayout en checkout marketplace; fragmento cuando vive bajo otro shell.
 */
export default function CheckoutChrome({ embedido = false, children }: CheckoutChromeProps) {
  if (embedido) return children
  return <MainLayout>{children}</MainLayout>
}
