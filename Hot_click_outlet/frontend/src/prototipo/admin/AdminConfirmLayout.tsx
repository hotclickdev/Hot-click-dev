import type { ReactNode } from 'react'

/**
 * Layout de confirmación a pantalla completa (Figma 48:228 y similares).
 */
export default function AdminConfirmLayout({
  marca,
  titulo,
  cuerpo,
  children,
}: {
  marca: 'ok' | 'alerta'
  titulo: string
  cuerpo: string
  children: ReactNode
}) {
  const circulo =
    marca === 'ok'
      ? 'bg-[var(--hc-success-bg)] text-hc-success'
      : 'bg-[var(--hc-warning-bg)] text-hc-warning'
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-32">
      <div className={`mx-auto flex size-20 items-center justify-center rounded-full text-3xl font-bold ${circulo}`}>
        {marca === 'ok' ? 'OK' : '!'}
      </div>
      <h1 className="mt-6 text-center font-display text-xl font-bold">{titulo}</h1>
      <p className="mt-3 text-center text-sm text-hc-muted">{cuerpo}</p>
      <div className="mt-8 flex flex-col gap-3">{children}</div>
    </main>
  )
}
