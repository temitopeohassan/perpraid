"use client"

import { useEffect, createContext, useContext, ReactNode } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { apiClient } from '@/lib/api';
import { isFarcasterEnvironment } from '@/lib/farcaster-detection';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const isFarcaster = isFarcasterEnvironment();

  // Auto-connect on mount only when inside Farcaster
  // Outside Farcaster, users should connect via RainbowKit's ConnectButton
  useEffect(() => {
    if (isFarcaster && !isConnected && connectors.length > 0) {
      // Try to connect with Farcaster connector first
      const farcasterConnector = connectors.find(c => c.id === 'farcaster-miniapp');
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
      } else if (connectors[0]) {
        connect({ connector: connectors[0] });
      }
    }
  }, [isFarcaster, isConnected, connect, connectors]);

  // Update API client when address changes
  useEffect(() => {
    if (address) {
      apiClient.setWalletAddress(address);
    } else {
      apiClient.setWalletAddress('');
    }
  }, [address]);

  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    apiClient.setWalletAddress('');
  };

  return (
    <WalletContext.Provider
      value={{
        address: address || null,
        isConnected,
        connect: handleConnect,
        disconnect: handleDisconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
