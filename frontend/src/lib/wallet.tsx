import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useEffect } from "react";
import { isConnected, isAllowed, requestAccess, getAddress, signTransaction as freighterSign } from "@stellar/freighter-api";

interface WalletState {
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  sign: (xdr: string, networkPassphrase: string) => Promise<string>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isAllowed().then(allowed => {
      if (allowed) {
        getAddress().then(res => {
          if (res.address) setAddress(res.address);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const { isConnected: hasFreighter } = await isConnected();
      if (!hasFreighter) {
        throw new Error("Freighter wallet extension not detected — install it from freighter.app");
      }
      const access = await requestAccess();
      if (access.error) throw new Error(access.error.message ?? "Freighter access was denied");
      setAddress(access.address);
      return access.address;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  const sign = useCallback(async (xdr: string, networkPassphrase: string) => {
    const current = address ?? (await getAddress()).address;
    const result = await freighterSign(xdr, { networkPassphrase, address: current });
    if (result.error) throw new Error(result.error.message ?? "Signing was rejected");
    return result.signedTxXdr;
  }, [address]);

  const value = useMemo(
    () => ({ address, connecting, error, connect, disconnect, sign }),
    [address, connecting, error, connect, disconnect, sign]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
