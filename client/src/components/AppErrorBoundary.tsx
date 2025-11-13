import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[AppErrorBoundary] Caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo: errorInfo?.componentStack || null,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-destructive/20 bg-card p-8 text-center shadow-lg">
            <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
            
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                The application encountered an unexpected error.
                Please try refreshing the page.
              </p>
            </div>

            {this.state.error && (
              <details className="rounded-md bg-muted p-3 text-left text-xs">
                <summary className="cursor-pointer font-mono font-semibold">
                  Error details
                </summary>
                <div className="mt-2 space-y-2 font-mono">
                  <div>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div className="max-h-40 overflow-auto">
                      <strong>Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col gap-2">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="w-full"
                data-testid="button-reload"
              >
                Reload Application
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="w-full"
                data-testid="button-go-back"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
