import { Component, type ErrorInfo, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import PantallaFalloServidor from './PantallaFalloServidor'
import { crearReferenciaError } from './falloServidorHelpers'

type Props = { children: ReactNode }
type Estado = { referencia: string | null }

/**
 * Captura errores de render en rutas del comprador y muestra el fallo del servidor
 * (Figma `45:2322`). La referencia viaja como tag a Sentry para ubicar el evento.
 */
export default class ErrorBoundaryComprador extends Component<Props, Estado> {
  state: Estado = { referencia: null }

  static getDerivedStateFromError(): Estado {
    return { referencia: crearReferenciaError() }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, {
      tags: { referencia: this.state.referencia ?? 'sin-referencia' },
      extra: { componentStack: info.componentStack?.slice(0, 300) },
    })
  }

  render() {
    const { referencia } = this.state
    if (!referencia) return this.props.children
    return <PantallaFalloServidor referencia={referencia} onReintentar={() => globalThis.location.reload()} />
  }
}
