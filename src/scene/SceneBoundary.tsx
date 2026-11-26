import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Called once when the children throw, so the host can fall back to the still. */
  onError: () => void
  children: ReactNode
}

/**
 * Catches a failed chunk load or a renderer that cannot be created, so the canvas failing never
 * takes the whole page down. It renders nothing itself once it has caught an error.
 */
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    this.props.onError()
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}
