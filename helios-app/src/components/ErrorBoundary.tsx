import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }
      return (
        <div role="alert" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '50vh', padding: 40, textAlign: 'center', background: 'var(--helios-surface)',
          border: '1px solid var(--helios-border)', borderRadius: 20, margin: 40,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 13, color: 'var(--helios-muted)', marginBottom: 20, maxWidth: 460 }}>
            {this.state.error.message || 'An unexpected error occurred'}
          </p>
          <button type="button" onClick={this.reset} className="hs-btn-fill">
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
