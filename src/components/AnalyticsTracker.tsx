'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAnalytics } from '@/firebase/analytics/use-analytics';

/**
 * Component to handle global analytics tasks like UTM parameter tracking
 * and user property initialization.
 */
export function AnalyticsTracker() {
  const searchParams = useSearchParams();
  const { identifyUser, analytics } = useAnalytics();

  useEffect(() => {
    if (!analytics) return;

    const utmSource = searchParams.get('utm_source');
    
    // Initial Attribution: Check for Facebook Group origin
    if (utmSource === 'fb_group') {
      identifyUser({ community_origin: 'amakhala_fb' });
    }
  }, [analytics, searchParams, identifyUser]);

  return null;
}
