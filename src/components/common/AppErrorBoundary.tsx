import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  domain?: string;
}

interface State {
  error: Error | null;
}

class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.domain ?? "app"}] render error`, {
      error,
      componentStack: info.componentStack,
    });
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    const label = this.props.domain ?? "this section";

    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/5 p-6 max-w-2xl mx-auto mt-8"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="h-6 w-6 text-destructive mt-0.5 shrink-0"
            aria-hidden
          />
          <div className="space-y-3 flex-1">
            <div>
              <h2 className="text-lg font-semibold text-destructive">
                Something went wrong in {label}.
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                An unexpected error occurred while rendering this view. Click
                Retry to recover, or reload the page if the error persists.
              </p>
            </div>
            <pre className="text-xs bg-background border rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <div className="flex gap-2">
              <Button onClick={this.handleReset} className="gap-1">
                <RefreshCcw className="h-4 w-4" /> Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
                className="gap-1"
              >
                <Home className="h-4 w-4" /> Go Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
