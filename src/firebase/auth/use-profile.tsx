'use client';

import { useState, useEffect } from 'react';
import { useUser } from './use-user';
import { useDoc } from '../firestore/use-doc';
import { useFirestore } from '../provider';
import { doc } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  managed_lodge_ids?: string[];
  role?: string;
  // Matched distribution profiles
  bookingGeniusLevel?: number;
  expediaOneKeyLevel?: 'none' | 'blue' | 'silver' | 'gold-platinum';
  agodaVipLevel?: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  tripadvisorPlusActive?: boolean;
  wholesaleTradeTier?: number;
}

export function useProfile() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  
  const userDocRef = db && user ? doc(db, 'users', user.uid) : null;
  const { data: profile, loading: docLoading, error } = useDoc<UserProfile>(userDocRef);

  // --- Developer Impersonation (Localhost Only) ---
  const [mockProfile, setMockProfile] = useState<UserProfile | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const stored = sessionStorage.getItem('mock_profile');
      if (stored) {
        try {
          setMockProfile(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse mock profile', e);
        }
      }
    }
  }, []);

  return {
    user,
    profile: (typeof window !== 'undefined' && window.location.hostname === 'localhost' && mockProfile) ? mockProfile : profile,
    loading: authLoading || docLoading,
    error
  };
}
