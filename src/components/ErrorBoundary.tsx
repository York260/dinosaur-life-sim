import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: (retry: () => void, error: Error) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 通用錯誤邊界。捕捉子樹渲染時拋出的例外，避免整個畫面變成空白。
 * `fallback` 收到 retry()（清除錯誤、讓子樹重新掛載）與實際的 error 物件。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  retry = () => this.setState({ error: null });

  render() {
    if (this.state.error) return this.props.fallback(this.retry, this.state.error);
    return this.props.children;
  }
}
