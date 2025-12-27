"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

interface WalletContextType {
  address: string | null;
  setAddress: (address: string) => void;
  isConnected: boolean;
  connect: (address: string) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddressState] = useState<string | null>(null);

  useEffect(() => {
    // Load wallet address from localStorage on mount
    if (typeof window !== 'undefined') {
      const savedAddress = localStorage.getItem('wallet_address');
      if (savedAddress) {
        setAddressState(savedAddress);
        apiClient.setWalletAddress(savedAddress);
      }
    }
  }, []);

  const setAddress = (newAddress: string) => {
    setAddressState(newAddress);
    apiClient.setWalletAddress(newAddress);
  };

  const connect = (newAddress: string) => {
    setAddress(newAddress);
  };

  const disconnect = () => {
    setAddressState(null);
    apiClient.setWalletAddress('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wallet_address');
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        setAddress,
        isConnected: !!address,
        connect,
        disconnect,
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
