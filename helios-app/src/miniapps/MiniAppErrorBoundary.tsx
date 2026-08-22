import { Component, type ReactNode } from 'react'
import { MiniAppError } from './MiniAppStates'

interface Props {
  children: ReactNode
  resetKey?: string | null
}

interface State {
  error: Error | null
}

export class MiniAppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error) {
    console.error('[MiniAppErrorBoundary]', error)
  }

  render() {
    if (this.state.error) {
      return (
        <MiniAppError
          message={this.state.error.message || 'The mini app crashed.'}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
