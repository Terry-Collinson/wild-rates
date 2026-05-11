
"use client";

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, query, orderBy, limit, serverTimestamp, setDoc, doc, getDocs, where } from 'firebase/firestore';
import { TrendingUp, History, Loader2, ArrowLeft, ShieldAlert, BarChart3, Calendar, Activity, Wallet, Percent, MapPin, CheckCircle2, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { CompetitorRate } from '@/lib/types';
import MarketIntelligence from '@/components/admin/MarketIntelligence';
import { INITIAL_LODGES } from '@/lib/mock-data';

const ADMIN_EMAILS = ['reservations@amakhala.com', 'terry_collinson@debono.net'];

export default function MarketTrendsPage() {
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState("");
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  
  const [activeLodge, setActiveLodge] = useState<string>("all");
  const [commissionRate, setCommissionRate] = useState<number>(0.18);

  useEffect(() => {
    const isAdmin = user?.email && ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());
    if (!loadingUser && (!user || !isAdmin)) {
      router.push('/portal');
    }
  }, [user, loadingUser, router]);

  const ratesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'competitor_rates'),
      orderBy('check_in_date', 'asc'),
      limit(500)
    );
  }, [db]);

  const { data: rawRates, loading: loadingRates } = useCollection<CompetitorRate>(ratesQuery);

  const rates = useMemo(() => {
    if (!rawRates) return [];
    let filtered = [...rawRates];
    // We only want benchmarks for the intelligence charts
    filtered = filtered.filter(r => r.search_params?.is_benchmark === true);
    
    if (activeLodge !== 'all') {
      const lodgeName = INITIAL_LODGES.find(l => l.id === activeLodge)?.name;
      filtered = filtered.filter(r => r.lodge_name === lodgeName || !r.is_own_property);
    }
    return filtered.sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));
  }, [rawRates, activeLodge]);

  const historyQuery = useMemoFirebase(() => {
    if (!db || !selectedRateId) return null;
    return query(
      collection(db, 'competitor_rates', selectedRateId, 'history'),
      orderBy('scraped_at', 'desc'),
      limit(10)
    );
  }, [db, selectedRateId]);

  const { data: history } = useCollection<CompetitorRate>(historyQuery);

  const run90DaySync = async () => {
    if (!db) return;
    setSyncing(true);
    setSyncProgress(0);
    setSyncStatus("Enforcing Demo Standard: 2 Adults, 2 Nights Benchmark...");

    try {
      // Scan every 3rd day to show a broad spread quickly for demo
      for (let i = 0; i < 30; i++) {
        const stayDate = format(addDays(new Date(2026, 4, 15), i * 2), 'yyyy-MM-dd');
        setSyncStatus(`Benchmarking Stay Date: ${stayDate}`);
        
        const res = await fetch(`/api/market-sync?date=${stayDate}&adults=2&nights=2`);
        const data = await res.json();

        if (data.snapshot && Array.isArray(data.snapshot)) {
          for (const item of data.snapshot) {
            const rateData = {
              competitor_id: item.source,
              lodge_name: item.name,
              check_in_date: stayDate,
              scraped_at: serverTimestamp(),
              rate_zar: item.price, // API handles PPPN / 2 logic
              room_type: "Standard Benchmark (2 Pax)",
              is_own_property: item.is_own_property || false,
              is_verified_total: true,
              is_pppn: true,
              search_params: { 
                adults: 2, 
                nights: 2, 
                is_benchmark: true 
              }
            };

            const existingQuery = query(
              collection(db, 'competitor_rates'),
              where('lodge_name', '==', item.name),
              where('check_in_date', '==', stayDate),
              where('search_params.is_benchmark', '==', true)
            );
            
            const existingDocs = await getDocs(existingQuery);

            if (!existingDocs.empty) {
              const existingDoc = existingDocs.docs[0];
              const existingData = existingDoc.data();
              
              if (existingData.rate_zar !== item.price) {
                await addDoc(collection(db, 'competitor_rates', existingDoc.id, 'history'), {
                  ...existingData,
                  archived_at: serverTimestamp()
                });
                await setDoc(doc(db, 'competitor_rates', existingDoc.id), rateData, { merge: true });
              }
            } else {
              const newRef = doc(collection(db, 'competitor_rates'));
              await setDoc(newRef, rateData);
              await addDoc(collection(db, 'competitor_rates', newRef.id, 'history'), rateData);
            }
          }
        }

        setSyncProgress(((i + 1) / 30) * 100);
        await new Promise(r => setTimeout(r, 300));
      }

      setSyncStatus("Intelligence Refreshed.");
      toast({ title: "Benchmark Complete", description: "PPPN data normalized for 2026." });
    } catch (error: any) {
      setSyncStatus("Sync Failed.");
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setTimeout(() => setSyncing(false), 2000);
    }
  };

  if (loadingUser) return <div className="min-h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <main className="min-h-screen pb-24 text-foreground bg-[#050505]">
      <Navbar />
      
      <div className="pt-32 pb-12 bg-gradient-to-b from-black to-transparent border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/admin')} className="rounded-full text-white/60 hover:text-white bg-white/5">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="space-y-1">
                <h1 className="text-4xl font-headline font-bold text-white italic tracking-tight">Yield Recovery Center</h1>
                <p className="text-primary font-bold uppercase tracking-[0.3em] text-[10px]">Strategic Market Intelligence • {activeLodge === 'all' ? 'Reserve Wide' : 'Lodge Focus'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={run90DaySync} 
                disabled={syncing} 
                className="bg-primary text-black font-black h-14 px-8 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Run Benchmark Sync
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/10">
            <div className="p-4 space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-primary flex items-center gap-1.5 ml-1">
                <MapPin className="w-3 h-3" /> Property
              </Label>
              <Select value={activeLodge} onValueChange={setActiveLodge}>
                <SelectTrigger className="bg-white/5 border-none h-12 text-white rounded-xl">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-white">
                  <SelectItem value="all">Entire Amakhala Portfolio</SelectItem>
                  {INITIAL_LODGES.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-primary flex items-center gap-1.5 ml-1">
                <Percent className="w-3 h-3" /> OTA Leakage
              </Label>
              <Select value={commissionRate.toString()} onValueChange={(v) => setCommissionRate(parseFloat(v))}>
                <SelectTrigger className="bg-white/5 border-none h-12 text-white rounded-xl">
                  <SelectValue placeholder="Select Rate" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-white">
                  <SelectItem value="0.15">Standard (15%)</SelectItem>
                  <SelectItem value="0.18">Preferred (18%)</SelectItem>
                  <SelectItem value="0.20">Genius (20%)</SelectItem>
                  <SelectItem value="0.25">Peak (25%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-primary flex items-center gap-1.5 ml-1">
                <BarChart3 className="w-3 h-3" /> Normalization
              </Label>
              <div className="flex h-12 items-center px-4 bg-white/5 rounded-xl text-[10px] font-black text-white/40 uppercase tracking-tighter">
                ZAR • PPPN • TAX-INCL
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        {syncing && (
          <Card className="bg-primary border-none p-8 rounded-[2rem] shadow-2xl shadow-primary/10">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-black text-black tracking-widest">Benchmarking Data Points</p>
                  <p className="text-xl font-headline italic text-black">{syncStatus}</p>
                </div>
                <p className="text-2xl font-headline italic text-black">{Math.round(syncProgress)}%</p>
              </div>
              <Progress value={syncProgress} className="h-2 bg-black/10" />
            </div>
          </Card>
        )}

        <MarketIntelligence 
          rates={rates || []} 
          loading={loadingRates} 
          commissionRate={commissionRate}
          activeLodge={activeLodge}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="glass-card border-white/5 bg-black/40 rounded-[2rem] overflow-hidden">
               <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 p-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><Activity className="text-primary w-5 h-5" /></div>
                  <CardTitle className="text-2xl font-headline italic text-white">Live Parity Stream</CardTitle>
                </div>
                <Badge className="bg-white/5 text-white/60 border-white/10 uppercase text-[9px] font-black px-4 py-2">
                  {rates?.length || 0} Benchmarks Audited
                </Badge>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Date</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Property</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Rate (PPPN)</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Direct Gain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loadingRates ? (
                      <tr><td colSpan={4} className="px-8 py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></td></tr>
                    ) : rates?.length === 0 ? (
                      <tr><td colSpan={4} className="px-8 py-20 text-center text-white/20 italic text-sm">No benchmark data found. Click 'Run Benchmark Sync' to populate.</td></tr>
                    ) : rates?.map((rate) => (
                      <tr 
                        key={rate.id} 
                        onClick={() => setSelectedRateId(rate.id || null)}
                        className={`hover:bg-white/5 cursor-pointer transition-colors group ${selectedRateId === rate.id ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-8 py-6">
                           <span className="text-sm font-bold text-white">{rate.check_in_date}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                             <div className={`w-2 h-2 rounded-full ${rate.is_own_property ? 'bg-primary shadow-[0_0_8px_primary]' : 'bg-white/20'}`} />
                             <span className={`text-sm font-bold ${rate.is_own_property ? 'text-primary' : 'text-white'}`}>{rate.lodge_name}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-sm font-black text-white">R{rate.rate_zar?.toLocaleString()}</span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                             <TrendingUp className="w-3 h-3 text-emerald-400" />
                             <span className="text-sm font-bold text-emerald-400">
                               +R{Math.round(rate.rate_zar * (commissionRate - 0.05)).toLocaleString()}
                             </span>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-card border-white/5 bg-black/40 sticky top-32 rounded-[2rem] overflow-hidden">
               <div className="h-1.5 bg-primary" />
               <CardHeader className="p-8 pb-4">
                 <CardTitle className="text-xl font-headline italic text-white flex items-center gap-3">
                   <History className="w-5 h-5 text-primary" /> Rate Audit
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-8 pt-0 space-y-6">
                 {!selectedRateId ? (
                   <div className="py-20 text-center space-y-4">
                     <Activity className="w-12 h-12 mx-auto text-white/5" />
                     <p className="text-xs text-white/40 italic">Select a point to view yield history</p>
                   </div>
                 ) : (
                    <div className="space-y-6">
                      {history?.map((entry, idx) => (
                        <div key={idx} className="flex gap-4 relative pl-6 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-px before:bg-white/10 last:before:hidden">
                          <div className="absolute left-[-3px] top-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                          <div>
                            <p className="text-sm font-black text-white">R{entry.rate_zar?.toLocaleString()}</p>
                            <p className="text-[10px] text-white/40 font-bold uppercase">{entry.scraped_at?.seconds ? format(new Date(entry.scraped_at.seconds * 1000), 'MMM d, HH:mm') : 'Current'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                 )}
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
