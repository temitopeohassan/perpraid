"use client"

import { useEffect, createContext, useContext, ReactNode } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { apiClient } from '@/lib/api';

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

  // Auto-connect on mount if not already connected
  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  }, [isConnected, connect, connectors]);

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
