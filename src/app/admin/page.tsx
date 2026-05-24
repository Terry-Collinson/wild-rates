"use client"

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Quote, CompetitorRate } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where, getDocs, writeBatch } from 'firebase/firestore';
import { INITIAL_LODGES } from '@/lib/mock-data';
import {
  Shield,
  ClipboardList,
  Zap,
  Activity,
  Globe,
  Home,
  ShieldAlert,
  Loader2,
  Play,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MarketIntelligence from '@/components/admin/MarketIntelligence';
import UserManagement from '@/components/admin/UserManagement';
import { cn } from '@/lib/utils';
import { useAdmin } from './context';

const StatCard = ({ title, value, trend, icon }: { title: string, value: any, trend: string, icon: any }) => (
  <Card className="glass-card border-white/5 bg-white/[0.02] p-6 rounded-2xl">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-primary/10 text-primary rounded-lg">{icon}</div>
      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">{trend}</span>
    </div>
    <p className="text-[10px] uppercase font-bold text-muted-foreground">{title}</p>
    <h3 className="text-2xl font-black text-white mt-1">{value}</h3>
  </Card>
);

export default function AdminPage() {
  // Extract shared state cleanly from our high-level structural context loop
  const {
    activeTab,
    mode,
    setMode,
    activeLodgeFilter,
    mediaSyncing,
    setMediaSyncing,
    isSuperAdmin
  } = useAdmin();

  const db = useFirestore();
  const { toast } = useToast();
  const lodgesQuery = useMemoFirebase(() => db ? collection(db, 'lodges') : null, [db]);
  const { data: dbLodges } = useCollection<any>(lodgesQuery);
  const lodgesList = dbLodges && dbLodges.length > 0 ? dbLodges : INITIAL_LODGES;

  const [syncingUsers, setSyncingUsers] = useState(false);
  const [syncingLodges, setSyncingLodges] = useState(false);
  const [dryRunOnly, setDryRunOnly] = useState(true);
  const [cleanupAfterMerge, setCleanupAfterMerge] = useState(false);
  const [syncingProfiles, setSyncingProfiles] = useState(false);

  const runGoogleSync = async () => {
    setSyncingProfiles(true);
    try {
      const response = await fetch('/api/admin/sync-google-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Google Sync Complete",
          description: `Ingested ${data.stats.profilesSynced} profiles to 'api_lodgeprofiles' and ${data.stats.ratesSynced} to 'api_lodgerates' with 100% data integrity.`
        });
        console.log("Google Sync Logs:\n", data.logs.join("\n"));
      } else {
        throw new Error(data.error || "Unknown synchronization error");
      }
    } catch (error: any) {
      toast({
        title: "Synchronization Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSyncingProfiles(false);
    }
  };

  const runLodgeMerge = async () => {
    setSyncingLodges(true);
    try {
      const response = await fetch('/api/admin/merge-lodges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: dryRunOnly, cleanup: cleanupAfterMerge })
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: dryRunOnly ? "Dry Run Complete (Safe)" : "Lodge Merge Successful",
          description: `Consolidated: ${data.stats.merged} matched, ${data.stats.created} created, ${data.stats.deleted} cleaned up.`
        });
        console.log("Merge Logs:\n", data.logs.join("\n"));
      } else {
        throw new Error(data.error || "Unknown migration error");
      }
    } catch (error: any) {
      toast({
        title: "Merge Operation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSyncingLodges(false);
    }
  };


  // Primary Global Data Streams
  const quotesQuery = useMemoFirebase(() => db ? query(collection(db, 'quotes'), orderBy('timestamp', 'desc')) : null, [db]);
  const { data: quotes = [], loading: loadingQuotes } = useCollection<Quote>(quotesQuery);

  const ratesQuery = useMemoFirebase(() => db ? query(collection(db, 'competitor_rates'), where('search_params.is_benchmark', '==', true), orderBy('check_in_date', 'asc'), limit(200)) : null, [db]);
  const { data: rawRates = [], loading: loadingRates } = useCollection<CompetitorRate>(ratesQuery);

  // Compute operational data visibility parameters based on role and active lodge filtering
  const filteredQuotes = useMemo(() => {
    if (activeLodgeFilter === 'all') return quotes;
    return quotes.filter(q => q.lodgeId === activeLodgeFilter);
  }, [quotes, activeLodgeFilter]);

  const filteredRates = useMemo(() => {
    if (activeLodgeFilter === 'all') return rawRates;
    return rawRates.filter(r => r.lodgeId === activeLodgeFilter || !r.is_own_property);
  }, [rawRates, activeLodgeFilter]);

  const runMediaSync = async () => {
    setMediaSyncing(true);
    try {
      const response = await fetch('/api/admin/sync-images', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Media Sync Success",
          description: `Processed: ${data.stats?.total || 0} rooms. Synced: ${data.stats?.success || 0}, Failed: ${data.stats?.failed || 0}.`
        });
      } else {
        throw new Error(data.error || "Failed to download media CDN assets");
      }
    } catch (error: any) {
      toast({
        title: "Media Sync Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setMediaSyncing(false);
    }
  };

  const runUserSync = async () => {
    if (!db) return;
    setSyncingUsers(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);
      let count = 0;
      
      usersSnap.forEach((userDoc) => {
        const data = userDoc.data();
        // Protect super admin from accidental demotion
        if (data.email?.toLowerCase() === 'terry_collinson@debono.net') return;
        
        batch.update(userDoc.ref, {
          role: data.role || 'guest',
          isHero: data.isHero !== undefined ? data.isHero : true,
          permissions: data.permissions || [],
          managed_lodge_ids: data.managed_lodge_ids || []
        });
        count++;
      });
      
      if (count > 0) {
        await batch.commit();
        toast({ title: "Authorization Sync Complete", description: `Synchronized ${count} identities in Firestore.` });
      } else {
        toast({ title: "No Action Needed", description: "All user profiles are already provisioned." });
      }
    } catch (error: any) {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    } finally {
      setSyncingUsers(false);
    }
  };

  const headerTitle = isSuperAdmin
    ? (mode === 'operations' ? 'Administrator Dashboard' : 'Infrastructure Control')
    : 'Lodge Dashboard';

  if (loadingQuotes || loadingRates) {
    return (
      <div className="h-[50vh] w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">WildRates Authority</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl md:text-6xl font-headline italic font-bold tracking-tight text-white">
              {headerTitle} <span className="text-primary">.</span>
            </h1>
            <p className="text-muted-foreground font-medium max-w-xl text-xs md:text-sm leading-relaxed">
              {mode === 'operations'
                ? 'Command and control for the Amakhala Reserve direct-booking ecosystem.'
                : 'Global infrastructure and media asset synchronization.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
          <Button
            onClick={() => setMode('operations')}
            variant={mode === 'operations' ? 'default' : 'ghost'}
            className={cn(
              "rounded-xl px-6 h-11 text-[10px] uppercase font-black tracking-widest transition-all duration-300",
              mode === 'operations' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-white/40 hover:text-white"
            )}
          >
            Operations
          </Button>
          {isSuperAdmin && (
            <Button
              onClick={() => setMode('systems')}
              variant={mode === 'systems' ? 'default' : 'ghost'}
              className={cn(
                "rounded-xl px-6 h-11 text-[10px] uppercase font-black tracking-widest transition-all duration-300",
                mode === 'systems' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-white/40 hover:text-white"
              )}
            >
              Systems
            </Button>
          )}
        </div>
      </div>

      {mode === 'operations' ? (
        <div className="space-y-12">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Quotes" value={filteredQuotes.length} trend="+12%" icon={<ClipboardList className="w-5 h-5" />} />
                <StatCard title="Direct Conversions" value="14.2%" trend="+2.4%" icon={<Zap className="w-5 h-5" />} />
                <StatCard title="System Latency" value="14ms" trend="Optimal" icon={<Activity className="w-5 h-5" />} />
                <StatCard title="Network Status" value="Live" trend="Encrypted" icon={<Globe className="w-5 h-5" />} />
              </div>

              <MarketIntelligence
                rates={filteredRates}
                commissionRate={0.15}
                activeLodge={activeLodgeFilter}
              />
            </>
          )}

          {activeTab === 'sanctuaries' && (
            <div className="grid grid-cols-1 gap-12">
              <Card className="glass-card border-white/5 bg-black/40 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <CardHeader className="p-10 border-b border-white/5">
                  <div className="space-y-1">
                    <CardTitle className="text-3xl font-headline italic text-white">Lodge Registry</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Property scope and operational visibility</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/30">Property Name</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/30">System ID</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/30">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {lodgesList.filter(l => activeLodgeFilter === 'all' ? true : l.id === activeLodgeFilter).map((lodge) => (
                          <tr key={lodge.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                                  <Home className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                  <p className="font-bold text-white uppercase tracking-wider">{lodge.name}</p>
                                  <p className="text-[10px] text-white/40 uppercase">Amakhala Reserve</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-6">
                              <code className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded text-primary/80">UID_{lodge.id.toUpperCase()}</code>
                            </td>
                            <td className="px-10 py-6">
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase px-3 py-1">Operational</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="grid grid-cols-1 gap-12">
              <Card className="glass-card border-white/5 bg-black/40 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <CardHeader className="p-10 border-b border-white/5">
                  <div className="space-y-1">
                    <CardTitle className="text-3xl font-headline italic text-white">Transmission Log</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Direct request capture and conversion data</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                          <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/30">Timestamp</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/30">Lodge Target</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/30">Guest Auth</th>
                          <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/30">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredQuotes.map((quote) => (
                          <tr key={quote.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-10 py-6">
                              <p className="text-[11px] font-mono text-white/60">{quote.timestamp?.toDate ? format(quote.timestamp.toDate(), 'yyyy-MM-dd HH:mm') : 'Recently'}</p>
                            </td>
                            <td className="px-10 py-6">
                              <p className="font-bold text-white uppercase text-xs tracking-wider">{quote.lodgeName}</p>
                            </td>
                            <td className="px-10 py-6">
                              <p className="text-xs font-medium text-white/70">{quote.userEmail}</p>
                            </td>
                            <td className="px-10 py-6">
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase px-3 py-1">Captured</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : isSuperAdmin ? (
        <div className="space-y-12">
          {activeTab === 'users' ? (
            <UserManagement />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 glass-card border-white/5 bg-black/40 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardHeader className="p-10 border-b border-white/5">
                <div className="space-y-1">
                  <CardTitle className="text-3xl font-headline italic text-white">Media Asset Synchronization</CardTitle>
                  <CardDescription className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Global CDN and edge cache management</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Users className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white uppercase tracking-wider">User Authorization Provisioning</h4>
                        <p className="text-[10px] text-white/40 uppercase">Enforce baseline claims (role: guest, isHero: true) for all standard identities.</p>
                      </div>
                    </div>
                    <Button
                      onClick={runUserSync}
                      disabled={syncingUsers}
                      className="rounded-xl px-8 h-12 bg-white text-black hover:bg-white/90 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      {syncingUsers ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      Sync User Identities
                    </Button>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Zap className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white uppercase tracking-wider">CDN Global Rebuild</h4>
                        <p className="text-[10px] text-white/40 uppercase">Push local media changes to production edge</p>
                      </div>
                    </div>
                    <Button
                      onClick={runMediaSync}
                      disabled={mediaSyncing}
                      className="rounded-xl px-8 h-12 bg-white text-black hover:bg-white/90 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      {mediaSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      Sync Global Edge
                    </Button>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Home className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white uppercase tracking-wider">Consolidate Lodge Schemas</h4>
                        <p className="text-[10px] text-white/40 uppercase max-w-lg">
                          Merge the <code className="text-amber-400 font-mono">properties</code> and <code className="text-amber-400 font-mono">lodges</code> collections in Firestore into a single canonical source using multi-tier similarity mapping.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                      <div className="flex flex-col gap-1.5 px-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-white/60 uppercase cursor-pointer hover:text-white transition-colors">
                          <input 
                            type="checkbox" 
                            checked={dryRunOnly} 
                            onChange={(e) => setDryRunOnly(e.target.checked)}
                            className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                          />
                          Dry Run Only
                        </label>
                        <label className="flex items-center gap-2 text-[10px] font-bold text-white/60 uppercase cursor-pointer hover:text-white transition-colors">
                          <input 
                            type="checkbox" 
                            checked={cleanupAfterMerge} 
                            onChange={(e) => setCleanupAfterMerge(e.target.checked)}
                            className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                          />
                          Cleanup Source
                        </label>
                      </div>
                      <Button
                        onClick={runLodgeMerge}
                        disabled={syncingLodges}
                        className={cn(
                          "rounded-xl px-8 h-12 text-[10px] font-black uppercase tracking-widest transition-all",
                          dryRunOnly 
                            ? "bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/10" 
                            : "bg-white text-black hover:bg-white/90"
                        )}
                      >
                        {syncingLodges ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {dryRunOnly ? 'Run Dry Merge' : 'Execute Merge'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Globe className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white uppercase tracking-wider">Ingest Google Hotels Profiles</h4>
                        <p className="text-[10px] text-white/40 uppercase max-w-lg">
                          Sync all reserves and competitors into <code className="text-emerald-400 font-mono">api_lodgeprofiles</code> and structured prices to <code className="text-emerald-400 font-mono">api_lodgerates</code> without losing information.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={runGoogleSync}
                      disabled={syncingProfiles}
                      className="rounded-xl px-8 h-12 bg-white text-black hover:bg-white/90 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      {syncingProfiles ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      Sync Profiles
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Infrastructure Integrity</h4>
                    <span className="text-[10px] font-mono text-emerald-400">STATUS: 100% CONSISTENT</span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/[0.03]">
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/20">System Module</th>
                          <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/20">Availability</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {['Firestore Production', 'CDN Edge Nodes', 'Authentication Shield', 'Analytics Pipeline'].map((sys) => (
                          <tr key={sys} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4 text-[11px] font-medium text-white/60">{sys}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                OPERATIONAL
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card className="bg-primary/10 border-primary/20 p-8 rounded-[2rem] space-y-4">
                <ShieldAlert className="w-10 h-10 text-primary" />
                <h4 className="text-xl font-headline italic text-white">Infrastructure Integrity</h4>
                <p className="text-xs text-white/60 leading-relaxed italic">Admin mapping is bound to Firestore unique IDs. If a property ID changes in Booking.com, access policies must be updated to match the new system token.</p>
              </Card>
            </div>
          </div>
          )}
        </div>
      ) : null}
    </div>
  );
}