import { Card } from './ui/Card'

export function CargaCrm() {
  return <Card aria-busy="true" className="h-24 animate-pulse bg-hc-n-50" />
}

export function AvisoCrm({ children }: { children: string }) {
  return <Card role="status" className="text-sm text-hc-n-600">{children}</Card>
}
