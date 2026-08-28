import { ClerkProvider } from '@clerk/react'
import { Outlet } from 'react-router-dom'

const KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

export default function ClerkShell() {
  return (
    <ClerkProvider publishableKey={KEY}>
      <Outlet />
    </ClerkProvider>
  )
}
