"use client"

import { useState, useEffect, useTransition } from 'react';
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Zap, 
  Search, 
  Activity, 
  ArrowRight, 
  Globe, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Loader2,
  Calendar,
  LayoutDashboard,
  ShieldAlert
} from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase, useProfile } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { CompetitorRate, Lodge } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function WildEyeCalculatorPage() {
  const db = useFirestore();
  const [isPending, startTransition] = useTransition();
  
  // 1. Date Range State
  const [checkIn, setCheckIn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
  
  // 2. Selection State
  const [selectedLodgeId, setSelectedLodgeId] = useState<string>('');
  const [marketData, setMarketData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 3. Data Fetching - Lodges for Dropdown
  const { profile, loading: loadingProfile } = useProfile();
  const lodgesQuery = useMemoFirebase(() => db ? collection(db, 'lodges') : null, [db]);
  const { data: allLodges } = useCollection<Lodge>(lodgesQuery);

  const managed_lodge_ids = profile?.managed_lodge_ids || [];
  const isSuperAdmin = profile?.role === 'super_admin';

  const lodges = isSuperAdmin 
    ? allLodges 
    : allLodges?.filter(l => managed_lodge_ids.includes(l.id));

  // 4. Data Fetching - Internal Baseline (Benchmark)
  const baselineQuery = useMemoFirebase(() => {
    if (!db || !selectedLodgeId || !checkIn) return null;
    const lodge = lodges?.find(l => l.id === selectedLodgeId);
    if (!lodge) return null;

    return query(
      collection(db, 'competitor_rates'),
      where('search_params.is_benchmark', '==', true),
      where('is_own_property', '==', true),
      where('lodge_name', '==', lodge.name),
      where('check_in_date', '==', checkIn),
      limit(1)
    );
  }, [db, selectedLodgeId, checkIn, lodges]);
  
  const { data: baselineRates, loading: loadingBaseline } = useCollection<CompetitorRate>(baselineQuery);
  const baselineRate = baselineRates?.[0]?.rate_zar || 0;

  // 5. Live Market Sync Logic
  const fetchMarketData = async () => {
    if (!selectedLodgeId || !checkIn || !checkOut) return;
    
    setIsRefreshing(true);
    const lodge = lodges?.find(l => l.id === selectedLodgeId);
    const lodgeName = lodge?.name || 'Hlosi Game Lodge';

    try {
      const res = await fetch(`/api/market-compare?q=${encodeURIComponent(lodgeName)}&arrival=${checkIn}&departure=${checkOut}`);
      const data = await res.json();
      
      startTransition(() => {
        setMarketData(data);
      });
    } catch (err) {
      console.error('Market sync failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-sync when inputs change (debounced or simple)
  useEffect(() => {
    if (selectedLodgeId) {
      fetchMarketData();
    }
  }, [checkIn, checkOut, selectedLodgeId]);

  // Default selection
  useEffect(() => {
    if (lodges && lodges.length > 0 && !selectedLodgeId) {
      setSelectedLodgeId(lodges[0].id);
    }
  }, [lodges]);

  const variance = marketData?.bestPublicRate && baselineRate
    ? ((marketData.bestPublicRate - baselineRate) / baselineRate) * 100
    : 0;

  const [sidebarActiveTab, setSidebarActiveTab] = useState('wildeye');
  const [sidebarMode, setSidebarMode] = useState<'operations' | 'systems'>('operations');
  const [sidebarLodgeFilter, setSidebarLodgeFilter] = useState('all');

  if (loadingProfile) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const hasAccess = isSuperAdmin || managed_lodge_ids.length > 0;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-headline italic font-bold text-white mb-2">Restricted Access</h1>
        <p className="text-white/40 max-w-md mb-8">
          Your account is not currently assigned to any lodges. Please contact the system administrator to provision your access scope.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button asChild className="rounded-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white">
            <a href="mailto:reservations@amakhala.com">Contact System Admin</a>
          </Button>
          <Button variant="ghost" className="text-white/40 hover:text-white" onClick={() => window.location.href = '/portal'}>
            Return to Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#080808] text-white selection:bg-primary/30">
        <AdminSidebar 
          activeTab={sidebarActiveTab}
          setActiveTab={setSidebarActiveTab}
          mode={sidebarMode}
          setMode={setSidebarMode}
          activeLodgeFilter={sidebarLodgeFilter}
          setActiveLodgeFilter={setSidebarLodgeFilter}
          runMediaSync={() => {}}
          mediaSyncing={false}
        />
        <SidebarInset className="bg-transparent border-l border-white/5">
          <header className="flex h-20 items-center justify-between px-8 border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-white/40 hover:text-white" />
              <div className="h-4 w-px bg-white/10" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">WildEye Intelligence</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Live Engine</span>
                  </div>
                </div>
                <h1 className="text-xl font-headline italic tracking-tight">Market Comparison & Positioning</h1>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Active Scan</span>
                <span className="text-xs font-mono text-primary">GS-HOTEL-SCRAPE_V4</span>
              </div>
            </div>
          </header>

          <main className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Input Bar */}
            <Card className="bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
              <CardContent className="p-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Sanctuary</Label>
                    <Select value={selectedLodgeId} onValueChange={setSelectedLodgeId}>
                      <SelectTrigger className="bg-black/40 border-white/10 rounded-xl h-12 text-sm">
                        <SelectValue placeholder="Select Lodge" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                        {lodges?.map(lodge => (
                          <SelectItem key={lodge.id} value={lodge.id}>{lodge.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Check-In</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <Input 
                        type="date" 
                        value={checkIn} 
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="bg-black/40 border-white/10 rounded-xl h-12 pl-12 text-sm focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">Check-Out</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input 
                        type="date" 
                        value={checkOut} 
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="bg-black/40 border-white/10 rounded-xl h-12 pl-12 text-sm focus:ring-primary"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={fetchMarketData}
                    disabled={isRefreshing}
                    className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-xs"
                  >
                    {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Refresh Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Grid */}
            <div className={cn(
              "grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-500",
              isRefreshing ? "opacity-40" : "opacity-100"
            )}>
              {/* Internal Baseline */}
              <Card className="bg-[#0c0c0c] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <LayoutDashboard className="w-24 h-24" />
                </div>
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded border border-white/10">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Internal Strategy</span>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Amakhala Baseline Rate</h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-headline italic font-black text-white">
                        {loadingBaseline ? '---' : baselineRate > 0 ? `R${Math.round(baselineRate).toLocaleString()}` : 'NO DATA'}
                      </span>
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">PPPN</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest text-left">Source: Firestore Benchmarks</span>
                      <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5 px-3 text-[8px] font-black">PROTECTED</Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Market Reality */}
              <Card className="bg-[#0c0c0c] border border-white/5 rounded-xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Globe className="w-24 h-24" />
                </div>
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded border border-white/10">
                      <Globe className="w-4 h-4 text-white/40" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Market Reality (Live)</span>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Google Hotels Lowest Rate</h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-headline italic font-black text-white">
                        {isRefreshing ? '...' : marketData?.bestPublicRate ? `R${Math.round(marketData.bestPublicRate).toLocaleString()}` : 'SCANNING...'}
                      </span>
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">PPPN</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest truncate max-w-[200px]">
                        Lodge: {marketData?.lodgeName || 'Scanning...'}
                      </span>
                      <div className="flex gap-2">
                        {marketData?.link && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[8px] uppercase font-black tracking-widest text-primary hover:bg-primary/10" asChild>
                            <a href={marketData.link} target="_blank" rel="noopener noreferrer">View Source <ArrowRight className="ml-1 w-3 h-3" /></a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Variance Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="md:col-span-2 bg-[#0c0c0c] border border-white/5 rounded-xl p-8 flex items-center justify-between overflow-hidden relative">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-4">Positioning Variance</h4>
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "text-7xl font-headline italic font-black",
                      variance > 0 ? "text-emerald-400" : variance < 0 ? "text-red-400" : "text-white"
                    )}>
                      {variance > 0 ? '+' : ''}{Math.round(variance)}%
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {variance > 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
                        <span className="text-sm font-bold uppercase tracking-widest">
                          {variance > 0 ? 'Undercutting Market' : variance < 0 ? 'Premium Positioning' : 'Price Parity'}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 max-w-[300px]">
                        Our baseline is currently {Math.abs(Math.round(variance))}% {variance > 0 ? 'lower' : 'higher'} than the best available rate on Google Hotels.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="hidden lg:block h-24 w-px bg-white/5 mx-8" />
                
                <div className="hidden lg:block space-y-4 text-right">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Market Status</p>
                    <Badge className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-0",
                      variance > 10 ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
                    )}>
                      {variance > 10 ? 'UPSELL OPPORTUNITY' : 'OPTIMAL SPREAD'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Confidence Score</p>
                    <span className="text-xs font-mono text-primary">0.94 / 1.0</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-primary border-0 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-[0_20px_50px_rgba(var(--primary-rgb),0.3)]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-black">
                    <Activity className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Yield Recommendation</span>
                  </div>
                  <p className="text-black/80 text-sm font-medium leading-relaxed">
                    {variance > 15 
                      ? "Market demand is surging. Recommend lifting the baseline by R500 immediately to capture surplus value without losing conversion."
                      : variance < -5 
                      ? "We are currently positioned at a premium. Ensure marketing emphasizes the exclusive 'WildEye' inclusions to justify the delta."
                      : "Pricing is in the 'Sweet Spot'. Maintain current positioning to maximize occupancy for these dates."}
                  </p>
                </div>
                <Button className="w-full bg-black text-white hover:bg-black/80 rounded-2xl h-12 text-[10px] font-black uppercase tracking-widest mt-6">
                  Apply Strategy
                </Button>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
