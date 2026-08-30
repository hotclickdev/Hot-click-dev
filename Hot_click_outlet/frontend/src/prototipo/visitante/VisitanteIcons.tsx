import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(className: string | undefined): string {
  return className ?? 'size-5'
}

/** Íconos SVG del prototipo Visitante (sin emojis). */
export function IconoCasa(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconoBolsa(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path
        d="M6 8h12l-.8 11.2A2 2 0 0 1 15.2 21H8.8a2 2 0 0 1-2-1.8L6 8Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconoDiscover(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="m11 11 5-2-2 5-5 2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

export function IconoCarrito(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="M4 5h2l1.2 8.5A2 2 0 0 0 9.2 15h7.6a2 2 0 0 0 2-1.6L20 8H7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10" cy="19" r="1.3" fill="currentColor" />
      <circle cx="17" cy="19" r="1.3" fill="currentColor" />
    </svg>
  )
}

export function IconoCuenta(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 19c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconoChispa(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={base(props.className)} aria-hidden>
      <path d="M12 2.5 13.8 9l6.7 1.2L13.8 12 12 18.5 10.2 12 3.5 10.2 10.2 9z" />
    </svg>
  )
}

export function IconoEnviar(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="m5 12 14-7-4 14-3.5-5.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

export function IconoBuscar(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconoCorazon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={base(props.className)} aria-hidden>
      <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.6 12 20 12 20Z" />
    </svg>
  )
}

export function IconoCheck(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="m5 12 5 5 9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconoAlerta(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}

export function IconoInfo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
  )
}

export function IconoPlay(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={base(props.className)} aria-hidden>
      <path d="M9 7.5v9l8-4.5z" />
    </svg>
  )
}

export function IconoEstrella(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={base(props.className)} aria-hidden>
      <path d="m12 3.5 2.4 5.6 6.1.6-4.6 4 1.4 6-5.3-3.2-5.3 3.2 1.4-6-4.6-4 6.1-.6z" />
    </svg>
  )
}

export function IconoCerrar(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconoMas(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconoMenos(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconoFlechaDer(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconoVolver(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconoCandado(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <rect x="6" y="11" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 11V8a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function IconoEscudo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="M12 4 19 7v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function IconoCamion(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="M3 7h11v8H3zM14 10h5l2 3v2h-7z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="7" cy="17.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="17.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconoChat(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="M5 6h14v10H8l-3 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

export function IconoVacio(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={base(props.className)} aria-hidden>
      <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconoLike(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={base(props.className)} aria-hidden>
      <circle cx="8" cy="10" r="3" />
      <circle cx="16" cy="10" r="3" />
      <circle cx="12" cy="16" r="3" />
    </svg>
  )
}
