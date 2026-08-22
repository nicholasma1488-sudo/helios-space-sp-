import { Component, type ReactNode } from 'react'
import { MiniAppError } from './MiniAppStates'

interface Props {
  children: ReactNode
  resetKey?: string | null
}

interface State {
  error: Error | null
  resetKey?: string | null
}

export class MiniAppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
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
