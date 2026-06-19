// ============================================================================
// CapacityErrorBoundary — error boundary scoped to the capacity-platform
// ----------------------------------------------------------------------------
// Class component because hooks can't catch render-phase errors. Logs to
// console.error (which the platform forwards to Supabase Edge Function logs
// in production) and renders a recovery card with a "Retry" button that
// resets the boundary's state.
// ============================================================================

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Optional label for the failing route — surfaced in the error UI. */
  scope?: string;
}

interface State {
  error: Error | null;
}

class CapacityErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[capacity-platform] render error", {
      scope: this.props.scope,
      error,
      componentStack: info.componentStack,
    });
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/5 p-6 max-w-2xl"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="h-6 w-6 text-destructive mt-0.5 shrink-0"
            aria-hidden
          />
          <div className="space-y-3 flex-1">
            <div>
              <h2 className="text-lg font-semibold text-destructive">
                Something went wrong{this.props.scope ? ` in ${this.props.scope}` : ""}.
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                The capacity-platform view crashed while rendering. Click Retry
                to try again. If the error persists, copy the message below
                and ping the platform team.
              </p>
            </div>
            <pre className="text-xs bg-background border rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <div className="flex gap-2">
              <Button onClick={this.handleReset} className="gap-1">
                <RefreshCcw className="h-4 w-4" /> Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default CapacityErrorBoundary;
