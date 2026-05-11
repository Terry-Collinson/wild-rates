
'use client';

import React, { useMemo, useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Line,
  LineChart,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Zap,
  TrendingUpDown,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Globe,
  Wallet
} from 'lucide-react';
import { format } from 'date-fns';
import { CompetitorRate } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MarketIntelligenceProps {
  rates: CompetitorRate[];
  loading?: boolean;
  commissionRate: number;
  activeLodge: string;
}

export default function MarketIntelligence({ rates, loading, commissionRate, activeLodge }: MarketIntelligenceProps) {
  const [viewMode, setViewMode] = useState<'yield' | 'index'>('yield');

  const uniqueCompetitors = useMemo(() => {
    const names = new Set<string>();
    (rates || []).forEach(r => { if (!r.is_own_property && r.lodge_name) names.add(r.lodge_name); });
    return Array.from(names);
  }, [rates]);

  const analysis = useMemo(() => {
    // 1. Filter strictly for benchmarks (Standard 2 Adult, 2 Night PPPN)
    const benchmarkRates = rates.filter(r => r.search_params?.is_benchmark === true);
    if (benchmarkRates.length === 0) return null;

    // 2. Dynamic Date Generation - Only render dates with data (No Cliff)
    const availableDates = Array.from(new Set(benchmarkRates.map(r => r.check_in_date))).sort();
    
    const chartData = availableDates.map(date => {
      const dayRates = benchmarkRates.filter(r => r.check_in_date === date);
      const competitors = dayRates.filter(r => !r.is_own_property);
      const ownRates = dayRates.filter(r => r.is_own_property);
      
      // Calculate Market Average (from competitors)
      const marketAvg = competitors.length > 0 
        ? competitors.reduce((acc, curr) => acc + curr.rate_zar, 0) / competitors.length 
        : 7500; // Realistic demo fallback

      // Our Price (If 'all' active, use average of our properties, else use selected)
      let ownPrice = 0;
      if (activeLodge === 'all') {
        ownPrice = ownRates.length > 0 
          ? ownRates.reduce((acc, curr) => acc + curr.rate_zar, 0) / ownRates.length
          : marketAvg;
      } else {
        const targetLodgeRate = ownRates[0];
        ownPrice = targetLodgeRate ? targetLodgeRate.rate_zar : marketAvg;
      }

      // OTA Net = Gross minus commission
      const otaNet = ownPrice * (1 - commissionRate);
      
      // Wild Hero Net = Gross minus 5% discount (The amount the lodge actually receives)
      const heroNet = ownPrice * 0.95;
      
      const reclaim = Math.max(0, heroNet - otaNet);

      const competitorPoints: Record<string, number> = {};
      uniqueCompetitors.forEach(name => {
        const rate = dayRates.find(r => r.lodge_name === name);
        if (rate) competitorPoints[`comp_${name.replace(/\s+/g, '_')}`] = rate.rate_zar;
      });

      return { 
        date: format(new Date(date), 'MMM dd'), 
        fullDate: date, 
        otaNet: Math.round(otaNet), 
        heroNet: Math.round(heroNet), 
        reclaim: Math.round(reclaim), 
        ownPrice: Math.round(ownPrice), 
        marketAvg: Math.round(marketAvg), 
        variance: Math.round(ownPrice - marketAvg), 
        ...competitorPoints 
      };
    });

    const totalReclaim = chartData.reduce((acc, curr) => acc + curr.reclaim, 0);
    const avgDailyRecovery = totalReclaim / chartData.length;
    
    // Recovery estimate (60% occupancy assumption)
    const monthlyRecovery = Math.round(avgDailyRecovery * 30 * 0.6);

    return { 
      chartData, 
      avgDailyRecovery: Math.round(avgDailyRecovery), 
      monthlyRecovery,
      availableDates 
    };
  }, [rates, commissionRate, activeLodge, uniqueCompetitors]);

  if (loading) return <Card className="glass-card border-white/5 bg-black/40 h-[450px] flex items-center justify-center"><Activity className="w-10 h-10 text-primary animate-pulse" /></Card>;
  if (!analysis) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-white/5 bg-black/40 lg:col-span-3 overflow-hidden rounded-[2rem] shadow-2xl">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 px-8 py-6 gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-headline italic text-white flex items-center gap-3"><Zap className="text-primary w-6 h-6" /> {viewMode === 'yield' ? 'Yield Recovery' : 'Market Benchmarking'}</CardTitle>
              <CardDescription className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">{viewMode === 'yield' ? 'Net Revenue Capture (PPPN)' : 'Standardized Market Index'}</CardDescription>
            </div>
            <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-fit">
              <TabsList className="bg-white/5 border border-white/10 h-10"><TabsTrigger value="yield" className="text-[10px] uppercase font-bold px-4">Yield</TabsTrigger><TabsTrigger value="index" className="text-[10px] uppercase font-bold px-4">Index</TabsTrigger></TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-10 px-6">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'yield' ? (
                  <AreaChart data={analysis.chartData}>
                    <defs>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                    <Tooltip 
                      content={({ active, payload }) => { 
                        if (active && payload && payload.length) { 
                          const data = payload[0].payload; 
                          return (
                            <div className="bg-black/95 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                              <p className="text-[10px] font-bold text-white/40 uppercase mb-2">{data.fullDate}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-8 text-xs"><span className="text-white/60">OTA Net Share:</span><span className="text-red-400">R{data.otaNet.toLocaleString()}</span></div>
                                <div className="flex justify-between gap-8 text-xs"><span className="text-white/60">Wild Hero Net Share:</span><span className="text-emerald-400">R{data.heroNet.toLocaleString()}</span></div>
                                <div className="pt-2 mt-2 border-t border-white/10 flex justify-between gap-8 text-sm">
                                  <span className="font-bold text-primary">Direct Gain:</span>
                                  <span className="font-black text-primary">R{data.reclaim.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          );
                        } 
                        return null; 
                      }} 
                    />
                    <Area name="Wild Hero Net" type="monotone" dataKey="heroNet" stroke="hsl(var(--primary))" fill="url(#colorProfit)" strokeWidth={3} />
                    <Area name="OTA Net" type="monotone" dataKey="otaNet" stroke="rgba(248, 113, 113, 0.4)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                ) : (
                  <LineChart data={analysis.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis hide domain={['dataMin - 2000', 'dataMax + 2000']} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    {uniqueCompetitors.map((name) => <Line key={name} type="monotone" dataKey={`comp_${name.replace(/\s+/g, '_')}`} stroke="rgba(255, 255, 255, 0.05)" strokeWidth={1} dot={false} legendType="none" />)}
                    <Line name="Market Average" type="monotone" dataKey="marketAvg" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeDasharray="10 10" dot={false} />
                    <Line name="Your Price" type="stepAfter" dataKey="ownPrice" stroke="hsl(var(--primary))" strokeWidth={5} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="glass-card border-white/5 bg-primary h-[230px] flex flex-col justify-center p-8 relative overflow-hidden text-primary-foreground shadow-2xl rounded-[2rem]">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet className="w-20 h-20" /></div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /><p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Monthly Recovery</p></div>
              <div className="space-y-1"><h3 className="text-4xl font-headline font-bold italic">R{analysis.monthlyRecovery.toLocaleString()}</h3><p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Est @ 60% Reserve Occ.</p></div>
            </div>
          </Card>
          <Card className="glass-card border-white/5 bg-black/40 h-[220px] p-6 flex flex-col justify-between rounded-[2rem] shadow-2xl">
            <div className="flex items-center gap-2"><TrendingUpDown className="text-primary w-4 h-4" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Yield Matrix</p></div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px] pb-2 border-b border-white/5"><span className="text-white/40 flex items-center gap-2"><Globe className="w-3 h-3"/> Market Avg</span><span className="text-white font-bold">R{analysis.chartData[0]?.marketAvg.toLocaleString()}</span></div>
              <div className="flex justify-between items-center text-[11px] pb-2 border-b border-white/5"><span className="text-white/40 flex items-center gap-2"><Building className="w-3 h-3"/> Fee Reclaim</span><span className="text-emerald-400 font-bold">R{analysis.avgDailyRecovery.toLocaleString()} /nt</span></div>
              <div className="flex justify-between items-center text-[11px] pt-1"><span className="text-white font-bold">Recovery Delta</span><span className="text-primary font-black flex items-center gap-1">+{analysis.chartData[0]?.otaNet > 0 ? Math.round((analysis.avgDailyRecovery / analysis.chartData[0].otaNet) * 100) : 0}%<ArrowUpRight className="w-3 h-3" /></span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
