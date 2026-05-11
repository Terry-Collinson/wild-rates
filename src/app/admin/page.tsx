"use client"

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Quote, Lodge, Property, CompetitorRate } from '@/lib/types';
import { format, isValid, addDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield,
  LayoutDashboard,
  MapPin,
  Zap,
  Library,
  ClipboardList,
  CheckCircle2,
  Activity,
  ArrowRight,
  Filter,
  Play,
  Loader2,
  Database,
  Globe,
  ImageIcon,
  Menu,
  ChevronDown,
  ChevronUp,
  UserPlus,
  ShieldAlert,
  Lock,
  Plus,
  Key,
  AlertCircle,
  Facebook,
  Users,
  Home,
  TrendingUp,
  History,
  Clock,
  ExternalLink,
  LogOut,
  Settings,
  Search,
  Trash2,
  Edit,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase, useUser, useStorage } from '@/firebase';
import { collection, updateDoc, deleteDoc, doc, writeBatch, query, orderBy, limit, addDoc, serverTimestamp, setDoc, getDocs, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { INITIAL_LODGES } from '@/lib/mock-data';
import { processHotelScrape } from '@/lib/ingestion-utils';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import MarketIntelligence from '@/components/admin/MarketIntelligence';
import { cn } from '@/lib/utils';

const ADMIN_EMAILS = ['reservations@amakhala.com', 'terry_collinson@debono.net'];

interface SanctuaryDocument {
  id?: string;
  title: string;
  description: string;
  url: string;
  category: string;
  fileName: string;
  fileSize: number;
  uploadedAt: any;
}

interface AdminUser {
  id?: string;
  email: string;
  role: 'super_admin' | 'lodge_admin';
  managed_lodge_ids: string[];
  permissions: string[];
  addedAt?: any;
}

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
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");
  const [mode, setMode] = useState<"operations" | "systems">("operations");

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentLodge, setCurrentLodge] = useState('');
  const [syncLog, setSyncLog] = useState<{ name: string, status: string, bbid?: string }[]>([]);
  const [seeding, setSeeding] = useState(false);

  const [activeLodgeFilter, setActiveLodgeFilter] = useState<string>("all");
  const [mediaSyncing, setMediaSyncing] = useState(false);

  // FIXED: Removed duplicate newAdminEmail declaration here
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'super_admin' | 'lodge_admin'>('lodge_admin');
  const [newAdminLodges, setNewAdminLodges] = useState<string[]>([]);
  const [newAdminPerms, setNewAdminPermissions] = useState<string[]>(['view_trends']);
  const [addingAdmin, setAddingAdmin] = useState(false);

  const [lastRawJson, setLastRawJson] = useState<any>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    if (!loadingUser && (!user || !ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase()))) {
      router.push('/portal');
    }
  }, [user, loadingUser, router]);

  const quotesQuery = useMemoFirebase(() => db ? query(collection(db, 'quotes'), orderBy('timestamp', 'desc')) : null, [db]);
  const { data: quotes = [] } = useCollection<Quote>(quotesQuery);

  const lodgesQuery = useMemoFirebase(() => db ? collection(db, 'lodges') : null, [db]);
  const { data: liveLodges } = useCollection<Lodge>(lodgesQuery);

  const rawRatesQuery = useMemoFirebase(() => db ? query(collection(db, 'competitor_rates'), where('search_params.is_benchmark', '==', true), orderBy('check_in_date', 'asc'), limit(200)) : null, [db]);
  const { data: rawRates } = useCollection<CompetitorRate>(rawRatesQuery);

  const adminsQuery = useMemoFirebase(() => db ? query(collection(db, 'users'), where('role', 'in', ['super_admin', 'lodge_admin'])) : null, [db]);
  const { data: adminUsers, loading: loadingAdmins } = useCollection<AdminUser>(adminsQuery);

  const handleAddAdmin = async () => {
    if (!db || !newAdminEmail) return;
    setAddingAdmin(true);
    try {
      await addDoc(collection(db, 'users'), {
        email: newAdminEmail.toLowerCase().trim(),
        role: newAdminRole,
        managed_lodge_ids: newAdminRole === 'super_admin' ? [] : newAdminLodges,
        permissions: newAdminPerms,
        isHero: false,
        heroTier: 0,
        addedAt: serverTimestamp()
      });
      toast({ title: "Access Granted" });
      setNewAdminEmail('');
      setNewAdminLodges([]);
    } catch (error: any) {
      toast({ title: "Auth Error", description: error.message, variant: "destructive" });
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      toast({ title: "Access Revoked" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const seedLodges = async () => {
    if (!db) return;
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      for (const lodge of INITIAL_LODGES) {
        const lodgeRef = doc(db, 'lodges', lodge.id);
        const heroPlaceholder = PlaceHolderImages.find(img => img.id === lodge.slug)?.imageUrl || "";
        batch.set(lodgeRef, {
          ...lodge,
          region: "Amakhala",
          adminConfig: { heroImage: heroPlaceholder, amenities: ["Wifi", "Pool", "All-Inclusive", "Guided Safaris"], contactEmail: "reservations@amakhala.com", roomOverrides: {} },
          updatedAt: new Date().toISOString()
        }, { merge: true });
        const propRef = doc(db, 'properties', lodge.id);
        batch.set(propRef, { id: lodge.id, name: lodge.name, address: 'Amakhala Game Reserve', star_rating: 5, nightsbridge_id: lodge.nightsbridge_id, bookingProvider: lodge.bookingProvider || 'NightsBridge', updated_at: new Date().toISOString() }, { merge: true });
      }
      await batch.commit();
      toast({ title: "System Foundation Set" });
    } catch (error: any) {
      toast({ title: "Seed Error", description: error.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const runFullReserveSync = async () => {
    if (!db) return;
    setSyncing(true);
    setSyncProgress(0);
    setSyncLog([]);
    const syncDate = '2026-05-15';
    try {
      for (let i = 0; i < INITIAL_LODGES.length; i++) {
        const lodge = INITIAL_LODGES[i];
        setCurrentLodge(lodge.name);
        const res = await fetch(`/api/rates?q=${encodeURIComponent(lodge.name)}&arrival=${syncDate}&departure=${format(addDays(parseISO(syncDate), 1), 'yyyy-MM-dd')}&adults=2&rooms=1`);
        const data = await res.json();
        setLastRawJson(data);
        const { propertyDoc, roomTypes, marketRates } = processHotelScrape(data);
        if (propertyDoc) {
          const batch = writeBatch(db);
          const finalBbid = (propertyDoc.nightsbridge_id === "PENDING_MAPPING" || !propertyDoc.nightsbridge_id) ? lodge.nightsbridge_id : propertyDoc.nightsbridge_id;
          batch.set(doc(db, 'properties', propertyDoc.id), { ...propertyDoc, nightsbridge_id: finalBbid }, { merge: true });
          roomTypes.forEach(room => batch.set(doc(db, 'room_types', room.id), room, { merge: true }));
          marketRates.forEach(rate => {
            batch.set(doc(db, 'market_rates', rate.id), { ...rate, search_params: { adults: 2, nights: 2, is_benchmark: true } }, { merge: true });
          });
          if (finalBbid && finalBbid !== "PENDING_MAPPING") batch.update(doc(db, 'lodges', lodge.id), { nightsbridge_id: finalBbid, updatedAt: new Date().toISOString() });
          await batch.commit();
          setSyncLog(prev => [...prev, { name: lodge.name, status: 'Success', bbid: finalBbid }]);
        } else {
          setSyncLog(prev => [...prev, { name: lodge.name, status: 'No Data' }]);
        }
        setSyncProgress(((i + 1) / INITIAL_LODGES.length) * 100);
        await new Promise(r => setTimeout(r, 800));
      }
      toast({ title: "Global Intelligence Refreshed" });
    } catch (error) {
      toast({ title: "Sync Engine Interrupted", variant: "destructive" });
    } finally {
      setSyncing(false);
      setCurrentLodge('');
    }
  };

  const runMediaSync = async () => {
    setMediaSyncing(true);
    try {
      const res = await fetch('/api/admin/sync-images', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const total = data.stats?.total || 0;
        const project = data.stats?.logs?.[1] || 'Unknown';
        alert(`Sync Status:\nProject: ${project}\nRooms Found: ${total}\nCheck browser console (F12) for full details.`);
        console.log('Media Sync Full Logs:', data.stats?.logs);
        toast({
          title: "Media Sync Result",
          description: `Processed ${total} rooms. Successfully synced: ${data.stats?.success || 0}.`
        });
      } else {
        console.error('Media Sync Error Logs:', data.stats?.logs);
        throw new Error(data.error || 'Sync failed');
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

  if (loadingUser) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user || !ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase())) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#050505] text-white selection:bg-primary/30">
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mode={mode}
          setMode={setMode}
          activeLodgeFilter={activeLodgeFilter}
          setActiveLodgeFilter={setActiveLodgeFilter}
          runMediaSync={runMediaSync}
          mediaSyncing={mediaSyncing}
        />

        <SidebarInset>
          <Navbar />

          <main className="pt-24 pb-20 px-4 md:px-10 max-w-[1600px] mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div className="flex items-center gap-3 text-primary">
                    <Shield className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">WildRates Authority</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h1 className="text-5xl md:text-7xl font-headline italic font-bold tracking-tight">
                    {mode === 'operations' ? 'Operations' : 'Systems'} <span className="text-primary">.</span>
                  </h1>
                  <p className="text-muted-foreground font-medium max-w-xl text-sm md:text-base leading-relaxed">
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
                    "rounded-xl px-8 font-bold text-[10px] uppercase tracking-widest h-11 transition-all duration-500",
                    mode === 'operations' ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/20" : "text-white/40 hover:text-white"
                  )}
                >
                  Operations
                </Button>
                <Button
                  onClick={() => setMode('systems')}
                  variant={mode === 'systems' ? 'default' : 'ghost'}
                  className={cn(
                    "rounded-xl px-8 font-bold text-[10px] uppercase tracking-widest h-11 transition-all duration-500",
                    mode === 'systems' ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/20" : "text-white/40 hover:text-white"
                  )}
                >
                  Systems
                </Button>
              </div>
            </div>

            {mode === 'operations' ? (
              <div className="space-y-12">
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <StatCard title="Total Quotes" value={quotes.length} trend="+12%" icon={<ClipboardList className="w-4 h-4" />} />
                    <StatCard title="Confirmed" value={quotes.filter(q => q.status === 'Confirmed').length} trend="+5%" icon={<CheckCircle2 className="w-4 h-4" />} />
                    <StatCard title="Pending" value={quotes.filter(q => q.status === 'Pending').length} trend="-2%" icon={<Activity className="w-4 h-4" />} />
                    <StatCard title="Sync Health" value="100%" trend="Stable" icon={<Zap className="w-4 h-4" />} />
                  </div>
                )}

                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 glass-card border-white/5 bg-white/[0.02] rounded-[2.5rem] overflow-hidden">
                      <CardHeader className="px-10 py-8 border-b border-white/5 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-headline italic text-white">Recent Transmission Log</CardTitle>
                          <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">Live direct booking requests</CardDescription>
                        </div>
                        <Button variant="outline" className="rounded-xl border-white/10 text-[10px] uppercase font-bold tracking-widest h-10 px-6">Export Data</Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-10 py-5 text-[10px] uppercase font-black text-primary tracking-[0.2em]">Sanctuary</th>
                                <th className="px-10 py-5 text-[10px] uppercase font-black text-primary tracking-[0.2em]">Member</th>
                                <th className="px-10 py-5 text-[10px] uppercase font-black text-primary tracking-[0.2em]">Status</th>
                                <th className="px-10 py-5 text-[10px] uppercase font-black text-primary tracking-[0.2em]">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quotes.slice(0, 5).map((q) => (
                                <tr key={q.id} className="group border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                  <td className="px-10 py-6">
                                    <span className="text-sm font-bold text-white">{q.lodgeName}</span>
                                    <p className="text-[10px] text-muted-foreground uppercase mt-1">{q.roomName || 'Luxury Suite'}</p>
                                  </td>
                                  <td className="px-10 py-6 text-sm text-white/80">{q.userEmail}</td>
                                  <td className="px-10 py-6">
                                    <span className={cn(
                                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                      q.status === 'Confirmed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    )}>
                                      {q.status}
                                    </span>
                                  </td>
                                  <td className="px-10 py-6">
                                    <Button variant="ghost" size="sm" className="rounded-lg h-8 w-8 p-0 hover:bg-primary hover:text-white">
                                      <ArrowRight className="w-3 h-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-white/5 bg-white/[0.02] rounded-[2.5rem] p-10 flex flex-col justify-between overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px] -mr-16 -mt-16 rounded-full"></div>
                      <div className="space-y-8 relative">
                        <div className="space-y-1">
                          <CardTitle className="text-2xl font-headline italic text-white">Member Trends</CardTitle>
                          <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Reserve interaction metrics</CardDescription>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-white/60">Search Volume</span>
                              <span className="text-primary">84%</span>
                            </div>
                            <Progress value={84} className="h-1.5 bg-white/5" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-white/60">Conversion</span>
                              <span className="text-primary">12%</span>
                            </div>
                            <Progress value={12} className="h-1.5 bg-white/5" />
                          </div>
                        </div>
                      </div>
                      <div className="pt-10 relative">
                        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                          <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-2">System Insight</p>
                          <p className="text-xs text-white/60 leading-relaxed italic">"Direct booking requests have increased by 14% since the new Tier-1 hero verification was implemented."</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'sanctuaries' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-3 mb-4">
                      <Filter className="w-4 h-4 text-primary" />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={activeLodgeFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setActiveLodgeFilter('all')}
                          className="rounded-full text-[10px] uppercase font-bold px-4 h-8"
                        >
                          All Lodges
                        </Button>
                        {INITIAL_LODGES.map(l => (
                          <Button
                            key={l.id}
                            variant={activeLodgeFilter === l.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveLodgeFilter(l.id)}
                            className="rounded-full text-[10px] uppercase font-bold px-4 h-8"
                          >
                            {l.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {INITIAL_LODGES.filter(l => activeLodgeFilter === 'all' || activeLodgeFilter === l.id).map(lodge => (
                        <Card key={lodge.id} className="glass-card border-white/5 bg-white/[0.02] rounded-[2rem] overflow-hidden group hover:border-primary/30 transition-all duration-500">
                          <div className="h-48 relative overflow-hidden">
                            <img src={lodge.imageUrl || `https://source.unsplash.com/featured/?safari,lodge&sig=${lodge.id}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={lodge.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                            <div className="absolute bottom-6 left-6">
                              <Badge className="bg-primary/20 text-primary border-primary/20 mb-2 uppercase text-[8px] tracking-widest font-black">{lodge.category}</Badge>
                              <h3 className="text-xl font-headline italic font-bold text-white">{lodge.name}</h3>
                            </div>
                          </div>
                          <CardContent className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase font-bold text-white/40 tracking-widest">NightsBridge ID</p>
                                <p className="text-xs font-mono text-primary font-bold">{lodge.nightsbridge_id || 'PENDING'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase font-bold text-white/40 tracking-widest">Commission</p>
                                <p className="text-xs text-white font-bold">{((lodge.commissionRate || 0) * 100).toFixed(0)}% Preferred</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <Button variant="outline" className="flex-1 rounded-xl border-white/5 bg-white/5 text-[10px] uppercase font-bold tracking-widest h-10">Configure</Button>
                              <Button className="rounded-xl bg-primary text-primary-foreground text-[10px] uppercase font-bold tracking-widest h-10 px-6">View</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'intelligence' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <MarketIntelligence
                      rates={rawRates || []}
                      commissionRate={0.18}
                      activeLodge={activeLodgeFilter}
                    />
                  </div>
                )}

                {activeTab === 'bookings' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Card className="glass-card border-white/5 bg-white/[0.02] rounded-[2.5rem] overflow-hidden">
                      <CardHeader className="px-10 py-8 border-b border-white/5 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-headline italic text-white">Full Booking Repository</CardTitle>
                          <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">Global direct confirm stream</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="outline" className="rounded-xl border-white/10 text-[10px] uppercase font-bold tracking-widest h-10 px-6">Filter</Button>
                          <Button variant="outline" className="rounded-xl border-white/10 text-[10px] uppercase font-bold tracking-widest h-10 px-6">Download CSV</Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-10 py-6 text-[10px] uppercase font-black text-primary tracking-[0.2em]">Sanctuary</th>
                                <th className="px-10 py-6 text-[10px] uppercase font-black text-primary tracking-[0.2em]">Check-In / Out</th>
                                <th className="px-10 py-6 text-[10px] uppercase font-black text-primary tracking-[0.2em]">Member Info</th>
                                <th className="px-10 py-6 text-[10px] uppercase font-black text-primary tracking-[0.2em]">Status</th>
                                <th className="px-10 py-6 text-[10px] uppercase font-black text-primary tracking-[0.2em]">Amount</th>
                                <th className="px-10 py-6 text-[10px] uppercase font-black text-primary tracking-[0.2em]">Confirmed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quotes.map((q) => (
                                <tr key={q.id} className="group border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                  <td className="px-10 py-8">
                                    <span className="text-sm font-bold text-white">{q.lodgeName}</span>
                                    <p className="text-[10px] text-muted-foreground uppercase mt-1">{q.roomName || 'Luxury Suite'}</p>
                                  </td>
                                  <td className="px-10 py-8">
                                    <div className="flex flex-col text-xs text-white/80">
                                      <span>{q.checkIn}</span>
                                      <span className="text-[10px] text-white/30 uppercase mt-1">to {q.checkOut}</span>
                                    </div>
                                  </td>
                                  <td className="px-10 py-8">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-primary">
                                        {q.userEmail.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-xs text-white/80">{q.userEmail}</span>
                                    </div>
                                  </td>
                                  <td className="px-10 py-8">
                                    <span className={cn(
                                      "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                      q.status === 'Confirmed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    )}>
                                      {q.status}
                                    </span>
                                  </td>
                                  <td className="px-10 py-8">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-black text-white">R {q.memberPrice.toLocaleString()}</span>
                                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Save R {(q.otaPrice - q.memberPrice).toLocaleString()}</span>
                                    </div>
                                  </td>
                                  <td className="px-10 py-8">
                                    <Button variant="ghost" size="sm" className="rounded-lg h-9 w-9 p-0 border border-white/5 hover:bg-emerald-500 hover:text-white">
                                      <CheckCircle2 className="w-4 h-4" />
                                    </Button>
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
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-black/40 border-white/5 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 text-primary mb-4">
                      <Database className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">Infrastructure</span>
                    </div>
                    <Button variant="outline" className="w-full border-white/10 text-xs h-10 rounded-xl" onClick={seedLodges} disabled={seeding}>
                      {seeding ? <Loader2 className="animate-spin" /> : 'Re-Seed Foundation'}
                    </Button>
                  </Card>
                  <Card className="bg-black/40 border-white/5 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 text-primary mb-4">
                      <Globe className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">Analytics</span>
                    </div>
                    <Button variant="outline" className="w-full border-white/10 text-xs h-10 rounded-xl" asChild>
                      <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">GA4 Dashboard</a>
                    </Button>
                  </Card>
                  <Card className="bg-black/40 border-white/5 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 text-primary mb-4">
                      <Facebook className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">Marketing</span>
                    </div>
                    <Button variant="outline" className="w-full border-white/10 text-xs h-10 rounded-xl" asChild>
                      <Link href="/hero-join?utm_source=fb_group">Test FB Group Conversion</Link>
                    </Button>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden rounded-[2.5rem]">
                      <CardHeader className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 px-10 py-8 gap-6">
                        <div className="space-y-1 text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-2 text-primary">
                            <Zap className="w-6 h-6" />
                            <CardTitle className="text-2xl font-headline italic text-white">Global Sync Engine</CardTitle>
                          </div>
                          <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Execute reserve-wide market intelligence scraper</CardDescription>
                        </div>
                        <Button onClick={runFullReserveSync} disabled={syncing} size="lg" className="rounded-full px-12 font-black shadow-2xl shadow-primary/40 h-14 bg-primary text-primary-foreground">
                          {syncing ? <Loader2 className="animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                          Start Reserve Sync
                        </Button>
                      </CardHeader>
                      <CardContent className="p-10">
                        {syncing && (
                          <div className="space-y-4 mb-8 max-w-md mx-auto">
                            <div className="flex justify-between text-[10px] font-black text-primary uppercase">
                              <span>Processing {currentLodge}</span>
                              <span>{Math.round(syncProgress)}%</span>
                            </div>
                            <Progress value={syncProgress} className="h-2 bg-white/5" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {syncLog.map((log, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                              <div className="flex items-center gap-3">
                                {log.status === 'Success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Activity className="w-4 h-4 text-red-400" />}
                                <span className="text-[10px] font-bold text-white/70 uppercase truncate max-w-[80px]">{log.name}</span>
                              </div>
                              {log.bbid && log.bbid !== "PENDING" && <Badge variant="outline" className="text-[8px] border-white/10 text-white/40">{log.bbid}</Badge>}
                            </div>
                          ))}
                        </div>
                        {lastRawJson && (
                          <Collapsible open={showRawJson} onOpenChange={setShowRawJson} className="mt-8 pt-8 border-t border-white/5">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-widest text-primary">
                                {showRawJson ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                                Deep Inspect Raw Engine Data
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-4">
                              <pre className="p-6 bg-black/80 rounded-2xl border border-white/5 text-[10px] font-mono text-emerald-400 max-h-[400px] overflow-auto">{JSON.stringify(lastRawJson, null, 2)}</pre>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-white/5 bg-black/40 rounded-[2.5rem] overflow-hidden">
                      <CardHeader className="p-10 border-b border-white/5">
                        <div className="flex items-center gap-3 text-primary mb-2">
                          <Lock className="w-5 h-5" />
                          <CardTitle className="text-2xl font-headline italic text-white">Lodge Administrator Authorization</CardTitle>
                        </div>
                        <p className="text-xs text-muted-foreground">Provision sanctuary-level access using Firestore Unique IDs from the properties collection.</p>
                      </CardHeader>
                      <CardContent className="p-10 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-primary">Admin Email Address</Label>
                              <Input
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                placeholder="name@amakhala.com"
                                className="bg-white/5 border-white/10 h-12"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase font-bold text-primary">System Role</Label>
                              <Select value={newAdminRole} onValueChange={(v: any) => setNewAdminRole(v)}>
                                <SelectTrigger className="h-12 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="lodge_admin">Lodge Administrator</SelectItem>
                                  <SelectItem value="super_admin">Reserve Super Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-3">
                              <Label className="text-[10px] uppercase font-bold text-primary">Capabilities</Label>
                              <div className="flex flex-wrap gap-3">
                                {['view_trends', 'manage_rates', 'manage_content'].map(p => (
                                  <div key={p} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                    <Checkbox
                                      id={`perm-${p}`}
                                      checked={newAdminPerms.includes(p)}
                                      onCheckedChange={(checked) => {
                                        setNewAdminPermissions(checked ? [...newAdminPerms, p] : newAdminPerms.filter(x => x !== p));
                                      }}
                                    />
                                    <label htmlFor={`perm-${p}`} className="text-[10px] font-bold text-white/60 cursor-pointer">{p.replace('_', ' ')}</label>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Button onClick={handleAddAdmin} disabled={addingAdmin || !newAdminEmail} className="w-full h-14 bg-primary text-black font-black rounded-full shadow-xl shadow-primary/20">
                              {addingAdmin ? <Loader2 className="animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                              Authorize Administrator
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <Label className="text-[10px] uppercase font-bold text-primary">Managed Sanctuaries (System IDs)</Label>
                            <div className={`grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto p-4 bg-white/5 rounded-2xl border border-white/10 ${newAdminRole === 'super_admin' ? 'opacity-20 pointer-events-none' : ''}`}>
                              {INITIAL_LODGES.map(l => (
                                <div key={l.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors group">
                                  <Checkbox
                                    id={`lodge-${l.id}`}
                                    checked={newAdminLodges.includes(l.id)}
                                    onCheckedChange={(checked) => {
                                      setNewAdminLodges(checked ? [...newAdminLodges, l.id] : newAdminLodges.filter(x => x !== l.id));
                                    }}
                                  />
                                  <div className="flex flex-col">
                                    <label htmlFor={`lodge-${l.id}`} className="text-xs font-bold text-white group-hover:text-primary cursor-pointer">{l.name}</label>
                                    <span className="text-[8px] font-mono text-white/30 uppercase">{l.id}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-10 border-t border-white/5 space-y-6">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <h3 className="text-lg font-headline italic">Authorized User Registry</h3>
                          </div>
                          <div className="overflow-x-auto rounded-xl border border-white/10">
                            <table className="w-full text-left">
                              <thead className="bg-white/5">
                                <tr>
                                  <th className="p-4 text-[9px] uppercase font-black text-muted-foreground">Administrator</th>
                                  <th className="p-4 text-[9px] uppercase font-black text-muted-foreground">Role</th>
                                  <th className="p-4 text-[9px] uppercase font-black text-muted-foreground">Scope (Property IDs)</th>
                                  <th className="p-4 text-right"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {loadingAdmins ? (
                                  <tr><td colSpan={4} className="p-10 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6 text-primary" /></td></tr>
                                ) : adminUsers?.map(admin => (
                                  <tr key={admin.id} className="hover:bg-white/2">
                                    <td className="p-4">
                                      <p className="text-sm font-bold text-white">{admin.email}</p>
                                      <div className="flex gap-1 mt-1">
                                        {admin.permissions.map(p => <Badge key={p} variant="outline" className="text-[7px] border-white/10 text-white/30 px-1.5">{p}</Badge>)}
                                      </div>
                                    </td>
                                    <td className="p-4"><Badge className={admin.role === 'super_admin' ? 'bg-primary text-black' : 'bg-white/10 text-white'}>{admin.role}</Badge></td>
                                    <td className="p-4">
                                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                                        {admin.role === 'super_admin' ? (
                                          <span className="text-[10px] text-white/60 font-medium">Reserve Wide</span>
                                        ) : admin.managed_lodge_ids?.map(id => (
                                          <Badge key={id} variant="secondary" className="text-[8px] bg-white/5 border-none">{id}</Badge>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="p-4 text-right">
                                      <Button size="icon" variant="ghost" className="text-red-400 hover:bg-red-400/10" onClick={() => admin.id && handleDeleteAdmin(admin.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="space-y-6">
                    <Card className="bg-primary/10 border-primary/20 p-8 rounded-[2rem] space-y-4">
                      <ShieldAlert className="w-10 h-10 text-primary" />
                      <h4 className="text-xl font-headline italic">Infrastructure Integrity</h4>
                      <p className="text-xs text-white/60 leading-relaxed italic">Admin mapping is bound to Firestore unique IDs. If a property ID changes in Booking.com, access policies must be updated to match the new system token.</p>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}