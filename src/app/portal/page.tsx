
"use client"

import { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import RateCalculator from '@/components/RateCalculator';
import { Card } from '@/components/ui/card';
import { Quote } from '@/lib/types';
import { format, isValid } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { History, Loader2, Calendar, Users } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export default function PortalPage() {
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();

  useEffect(() => {
    if (!loadingUser && !user) {
      window.location.href = '/login';
    }
  }, [user, loadingUser]);

  const quotesQuery = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return query(
      collection(db, 'quotes'),
      where('userEmail', '==', user.email)
    );
  }, [db, user?.email]);

  const { data: rawQuotes, loading: loadingQuotes } = useCollection<Quote>(quotesQuery);

  const quotes = useMemo(() => {
    if (!rawQuotes) return [];
    return [...rawQuotes].sort((a, b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
    });
  }, [rawQuotes]);

  const safeFormatDate = (dateStr: string | undefined, formatStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return isValid(date) ? format(date, formatStr) : 'N/A';
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen pb-24">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 mt-28 space-y-12">
        <RateCalculator />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="text-primary w-5 h-5" />
              <h2 className="text-2xl font-headline font-bold text-white">Your Recent Requests</h2>
            </div>
            {loadingQuotes && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          </div>
          
          <Card className="glass-card overflow-hidden border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lodge</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dates</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Occupancy</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">OTA PPPN</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Member PPPN</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {quotes && quotes.length > 0 ? (
                    quotes.map((quote, idx) => (
                      <tr key={quote.id || idx} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{quote.lodgeName}</div>
                          {quote.roomName && <div className="text-[10px] text-muted-foreground">{quote.roomName}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 text-primary" />
                            {quote.checkIn && quote.checkOut ? (
                              `${safeFormatDate(quote.checkIn, 'MMM d')} - ${safeFormatDate(quote.checkOut, 'MMM d, yyyy')}`
                            ) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-white">
                            <Users className="w-3 h-3 text-primary" />
                            <span>{quote.guests || 0}A {quote.childrenAges?.length ? `+ ${quote.childrenAges.length}C` : ''}</span>
                          </div>
                          {quote.childrenAges && quote.childrenAges.length > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Ages: {quote.childrenAges.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm opacity-50">R{(quote.otaPrice || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 font-bold text-primary">R{(quote.memberPrice || 0).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={quote.status === 'Confirmed' ? 'default' : 'secondary'} 
                            className={quote.status === 'Confirmed' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                              : 'bg-primary/20 text-primary border-primary/30'}
                          >
                            {quote.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                        {loadingQuotes ? 'Loading your history...' : 'No direct rate requests yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
