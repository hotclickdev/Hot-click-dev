import { Component, type ErrorInfo, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'

type AdminErrorBoundaryProps = {
  children: ReactNode
  titulo?: string
  detalle?: string
  accion?: string
}

type AdminErrorBoundaryState = {
  hasError: boolean
}

/**
 * Captura errores de render del panel admin/POS y ofrece recarga.
 */
export default class AdminErrorBoundary extends Component<
  AdminErrorBoundaryProps,
  AdminErrorBoundaryState
> {
  static defaultProps = {
    titulo: 'Error inesperado',
    detalle: 'Algo salió mal en el panel. Si el problema persiste, contactá soporte.',
    accion: 'Recargar panel',
  }

  state: AdminErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AdminErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack?.slice(0, 300) },
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center p-8" style={{ backgroundColor: 'var(--hc-bg)' }}>
        <div className="max-w-sm space-y-4 text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <svg className="h-7 w-7" style={{ color: '#f87171' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>{this.props.titulo}</p>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            {this.props.detalle}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false })
              globalThis.location.reload()
            }}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
          >
            {this.props.accion}
          </button>
        </div>
      </div>
    )
  }
}
