import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'white', background: '#990000', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1>Oops, có lỗi xảy ra trong React!</h1>
          <h3 style={{ color: '#ffaaaa' }}>Vui lòng copy toàn bộ nội dung bên dưới và gửi cho bot:</h3>
          <div style={{ background: 'rgba(0,0,0,0.8)', padding: '1rem', marginTop: '1rem', overflow: 'auto' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '1rem' }}>ERROR MESSAGE:</div>
            <pre style={{ whiteSpace: 'pre-wrap', color: '#ff6b6b' }}>{this.state.error && this.state.error.toString()}</pre>
            
            <div style={{ fontWeight: 'bold', margin: '1rem 0' }}>COMPONENT STACK:</div>
            <pre style={{ whiteSpace: 'pre-wrap', color: '#a8c7fa' }}>{this.state.errorInfo?.componentStack}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
