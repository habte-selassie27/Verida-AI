import { Component, type ReactNode } from 'react';
import WebGLFallback from './WebGLFallback';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class SceneErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error) {
    console.error('[SceneErrorBoundary] 3D scene error:', error);
  }

  override render() {
    if (this.state.hasError) {
      return <WebGLFallback />;
    }
    return this.props.children;
  }
}
