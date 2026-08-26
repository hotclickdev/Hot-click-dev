import { Component } from 'react'
import * as Sentry from '@sentry/react'

/**
 * Captura errores de render del panel admin/POS y ofrece recarga.
 * Reporta a Sentry sin cambiar el fallback visual.
 */
export default class AdminErrorBoundary extends Component {
  static defaultProps = {
    titulo: 'Error inesperado',
    detalle: 'Algo salió mal en el panel. Si el problema persiste, contactá soporte.',
    accion: 'Recargar panel',
  }
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) {
    Sentry.captureException(error, { extra: { componentStack: info?.componentStack?.slice(0, 300) } })
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: 'var(--hc-bg)' }}>
        <div className="max-w-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg className="w-7 h-7" style={{ color: '#f87171' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>{this.props.titulo}</p>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            {this.props.detalle}
          </p>
          <button type="button"
            onClick={() => { this.setState({ hasError: false }); globalThis.location.reload() }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
          >
            {this.props.accion}
          </button>
        </div>
      </div>
    )
  }
}
