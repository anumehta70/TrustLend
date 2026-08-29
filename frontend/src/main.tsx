import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import posthog from "posthog-js";
import App from "./App";
import { WalletProvider } from "./lib/wallet";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/tokens.css";

import { ThemeProvider } from "./lib/ThemeContext";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
if (posthogKey) {
  posthog.init(posthogKey, { api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://app.posthog.com" });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <WalletProvider>
            <App />
          </WalletProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
