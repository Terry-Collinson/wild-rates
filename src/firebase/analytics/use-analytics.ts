'use client';

import { logEvent, setUserProperties, type Analytics } from 'firebase/analytics';
import { useAnalyticsInstance } from '../provider';
import { useCallback } from 'react';

/**
 * Custom hook to interact with Firebase Analytics.
 * Ensures analytics calls only run on the client side.
 */
export function useAnalytics() {
  const analytics = useAnalyticsInstance();

  const trackEvent = useCallback((eventName: string, eventParams?: { [key: string]: any }) => {
    if (analytics) {
      logEvent(analytics, eventName, eventParams);
    }
  }, [analytics]);

  const identifyUser = useCallback((properties: { [key: string]: any }) => {
    if (analytics) {
      setUserProperties(analytics, properties);
    }
  }, [analytics]);

  return { trackEvent, identifyUser, analytics };
}
