"use client"

import { createContext, useContext } from 'react';

export interface AdminContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mode: 'operations' | 'systems';
  setMode: (mode: 'operations' | 'systems') => void;
  activeLodgeFilter: string;
  setActiveLodgeFilter: (filter: string) => void;
  mediaSyncing: boolean;
  setMediaSyncing: (syncing: boolean) => void;
  isSuperAdmin: boolean;
}

export const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
};
