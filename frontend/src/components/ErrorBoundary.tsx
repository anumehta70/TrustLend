import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Unhandled UI error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page" style={{ paddingTop: "96px" }}>
          <div className="ledger-card banner-error">
            <p className="card-label">Ledger interrupted</p>
            <h2 className="h2">Something went wrong rendering this page.</h2>
            <p className="lede">{this.state.error.message}</p>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
