"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Home, User, LogIn, ChevronDown, Facebook, Shield, Settings, Check, Crown, Globe } from 'lucide-react';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase, useProfile } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { usePathname } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { INITIAL_LODGES } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ADMIN_EMAILS = ['reservations@amakhala.com', 'terry_collinson@debono.net'];
const FB_GROUP_URL = `https://www.facebook.com/groups/135339659870615`;

export default function Navbar() {
  const { user, loading } = useUser();
  const { profile } = useProfile();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();

  // Settings Form State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [bookingGeniusLevel, setBookingGeniusLevel] = useState<number>(0);
  const [expediaOneKeyLevel, setExpediaOneKeyLevel] = useState<'none' | 'blue' | 'silver' | 'gold-platinum'>('none');
  const [agodaVipLevel, setAgodaVipLevel] = useState<'none' | 'bronze' | 'silver' | 'gold' | 'platinum'>('none');
  const [tripadvisorPlusActive, setTripadvisorPlusActive] = useState<boolean>(false);
  const [wholesaleTradeTier, setWholesaleTradeTier] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when profile loads or modal opens
  useEffect(() => {
    if (profile) {
      setUserName(profile.name || '');
      setBookingGeniusLevel(profile.bookingGeniusLevel || 0);
      setExpediaOneKeyLevel(profile.expediaOneKeyLevel || 'none');
      setAgodaVipLevel(profile.agodaVipLevel || 'none');
      setTripadvisorPlusActive(!!profile.tripadvisorPlusActive);
      setWholesaleTradeTier(profile.wholesaleTradeTier || 0);
    }
  }, [profile, settingsOpen]);

  const handleSaveSettings = async () => {
    if (!db || !user) return;
    setIsSaving(false); // set to false first to toggle clean
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: userName,
        bookingGeniusLevel,
        expediaOneKeyLevel,
        agodaVipLevel,
        tripadvisorPlusActive,
        wholesaleTradeTier,
      }, { merge: true });
      
      toast({
        title: "Settings Saved",
        description: "Your personal details and loyalty profiles have been updated successfully.",
      });
      setSettingsOpen(false);
    } catch (e: any) {
      toast({
        title: "Save Failed",
        description: e.message || "Failed to save profile settings.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const lodgesQuery = useMemoFirebase(() => db ? collection(db, 'lodges') : null, [db]);
  const { data: dbLodges } = useCollection<any>(lodgesQuery);
  const lodgesList = dbLodges && dbLodges.length > 0 ? dbLodges : INITIAL_LODGES;
  
  const pathname = usePathname();
  
  const logoUrl = PlaceHolderImages.find(img => img.id === 'app-logo-icon')?.imageUrl || '/icons/icon-192x192.png';
  const isPortal = pathname?.startsWith('/portal') || pathname?.startsWith('/admin');
  const isAdmin = user?.email && ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());

  const handleLogout = async () => {
    if (!auth) return;
    sessionStorage.removeItem('mock_profile');
    await signOut(auth);
    window.location.href = '/';
  };

  const handleSimulateAdmin = (lodgeId: string, lodgeName: string) => {
    const mock = {
      id: `mock-${lodgeId}`,
      name: `${lodgeName} Admin`,
      email: `admin@${lodgeId}.test`,
      managed_lodge_ids: [lodgeId],
      role: 'lodge_admin'
    };
    sessionStorage.setItem('mock_profile', JSON.stringify(mock));
    window.location.href = '/admin';
  };

  const handleClearSimulation = () => {
    sessionStorage.removeItem('mock_profile');
    window.location.reload();
  };

  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  return (
    <nav className="sticky top-0 left-0 right-0 z-[100] bg-background/60 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center group gap-4">
            <div className="relative w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl overflow-hidden border border-white/10 group-hover:border-primary/50 transition-all shrink-0">
              <Image 
                src={logoUrl} 
                alt="Wild Rates Logo" 
                width={48} 
                height={48}
                className="object-cover"
                priority
              />
            </div>
            {isPortal ? (
              <div className="flex flex-col">
                <span className="text-xl font-headline font-bold text-white tracking-tight leading-none">Rate Calculator</span>
                <span className="text-primary font-bold tracking-[0.2em] uppercase text-[10px] mt-1">Direct Conservation Rates</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-lg font-headline font-bold text-white leading-none">Wild Rates</span>
                <span className="text-muted-foreground text-[10px] uppercase tracking-widest mt-1">Direct Guardianship</span>
              </div>
            )}
          </Link>

          {!isPortal && (
            <div className="hidden md:flex items-center gap-6 ml-4">
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Home</Link>
              <Link href="/learn-more" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About</Link>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {!loading && user ? (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-12 px-4 border border-white/10 hover:bg-white/5 rounded-full bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex flex-col items-start hidden md:flex text-left">
                      <span className="text-xs font-bold text-white leading-none">Member</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{user.email}</span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 glass-card border-white/10 p-2">
                  <DropdownMenuLabel className="px-2 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Authenticated Account</p>
                    <p className="text-sm font-bold text-white truncate">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/5" />
                  
                  <DropdownMenuItem asChild className="focus:bg-white/5 cursor-pointer py-3 rounded-lg">
                    <Link href="/portal" className="flex items-center gap-3 w-full">
                      <Home className="w-4 h-4 text-primary" />
                      <span>Rate Calculator</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="focus:bg-white/5 cursor-pointer py-3 rounded-lg">
                    <div className="flex items-center gap-3 w-full">
                      <Settings className="w-4 h-4 text-primary" />
                      <span>Account Settings</span>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild className="focus:bg-white/5 cursor-pointer py-3 rounded-lg">
                    <a href={FB_GROUP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full">
                      <Facebook className="w-4 h-4 text-primary" />
                      <span>Facebook Group</span>
                    </a>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuLabel className="px-2 pt-2 text-[9px] uppercase tracking-[0.2em] text-primary/60">Admin Tools</DropdownMenuLabel>
                      
                      <DropdownMenuItem asChild className="focus:bg-white/5 cursor-pointer py-3 rounded-lg">
                        <Link href="/admin" className="flex items-center gap-3 w-full">
                          <LayoutDashboard className="w-4 h-4 text-primary" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {isLocalhost && (
                    <>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuLabel className="px-2 pt-2 text-[9px] uppercase tracking-[0.2em] text-amber-500/60">Developer Tools</DropdownMenuLabel>
                      
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="focus:bg-white/5 cursor-pointer py-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-amber-500" />
                            <span>Impersonate Lodge Admin</span>
                          </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="w-56 glass-card border-white/10 p-2 bg-[#0a0a0a] z-[60]">
                            {lodgesList.map(lodge => (
                              <DropdownMenuItem 
                                key={lodge.id}
                                onClick={() => handleSimulateAdmin(lodge.id, lodge.name)}
                                className="focus:bg-white/5 cursor-pointer py-2 rounded-md text-[10px]"
                              >
                                {lodge.name}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem 
                              onClick={handleClearSimulation}
                              className="focus:bg-red-500/10 text-red-400 cursor-pointer py-2 rounded-md text-[10px]"
                            >
                              Reset to Actual User
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </>
                  )}

                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="focus:bg-destructive/10 text-destructive cursor-pointer py-3 rounded-lg font-bold"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : !loading ? (
            <Button variant="default" asChild className="bg-primary text-primary-foreground hover:opacity-90 h-12 px-6 rounded-full font-bold">
              <Link href="/login" className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span>Member Login</span>
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      {/* Account & Loyalty Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="glass-card border-white/10 bg-[#070c09]/95 text-white max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-8 space-y-6">
          <DialogHeader className="text-center pb-4 border-b border-white/5">
            <DialogTitle className="text-2xl font-headline font-bold italic text-white flex items-center justify-center gap-3">
              <Settings className="w-6 h-6 text-primary" />
              Account & Loyalty Settings
            </DialogTitle>
            <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mt-1">Configure your personal profile & active loyalty tiers</p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Section 1: Personal Details */}
            <div className="space-y-4 p-5 rounded-2xl bg-white/5 border border-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Personal Profile</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Display Name</Label>
                  <Input 
                    id="displayName"
                    value={userName} 
                    onChange={(e) => setUserName(e.target.value)} 
                    placeholder="Enter your name" 
                    className="bg-black/40 border-white/10 text-white placeholder-white/30 h-12"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Distribution Loyalty setup */}
            <div className="space-y-6">
              {/* B2C Retail - Booking.com Genius */}
              <div className="space-y-3 p-5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#003580] fill-white" />
                    Booking.com Genius
                  </h3>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] font-black uppercase">RETAIL B2C</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setBookingGeniusLevel(lvl)}
                      className={`py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                        bookingGeniusLevel === lvl 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-white/5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {lvl === 0 ? 'None' : `Level ${lvl}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* B2C Retail - Expedia One Key */}
              <div className="space-y-3 p-5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#F1D37E] fill-primary" />
                    Expedia One Key
                  </h3>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] font-black uppercase">RETAIL B2C</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['none', 'blue', 'silver', 'gold-platinum'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setExpediaOneKeyLevel(tier)}
                      className={`py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                        expediaOneKeyLevel === tier 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-white/5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {tier === 'none' ? 'None' : tier === 'gold-platinum' ? 'Gold+' : tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agoda VIP */}
              <div className="space-y-3 p-5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Crown className="w-4 h-4 text-emerald-400" />
                    Agoda VIP Status
                  </h3>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] font-black uppercase">META-SEARCH</Badge>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {(['none', 'bronze', 'silver', 'gold', 'platinum'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setAgodaVipLevel(tier)}
                      className={`py-2 rounded-xl text-[9px] font-bold uppercase transition-all border ${
                        agodaVipLevel === tier 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-white/5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tripadvisor Plus & Trade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tripadvisor Plus */}
                <button
                  type="button"
                  onClick={() => setTripadvisorPlusActive(!tripadvisorPlusActive)}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    tripadvisorPlusActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-white/5 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Tripadvisor Plus</span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[7px] font-black uppercase">META</Badge>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1 leading-relaxed">Paid subscription status ($99/year)</p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${tripadvisorPlusActive ? 'border-primary bg-primary' : 'border-white/20'}`}>
                      {tripadvisorPlusActive && <Check className="w-2.5 h-2.5 text-black font-black" />}
                    </div>
                    <span className={tripadvisorPlusActive ? 'text-primary' : 'text-white/60'}>
                      {tripadvisorPlusActive ? 'Active (10-20% Off)' : 'Not Subscribed'}
                    </span>
                  </div>
                </button>

                {/* Wholesale Agent */}
                <div className={`p-5 rounded-2xl border bg-white/5 border-white/5 text-left flex flex-col justify-between`}>
                  <div className="flex justify-between items-start w-full mb-1">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">B2B Trade Channel</span>
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[7px] font-black uppercase">WHOLESALE</Badge>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed mb-3">FIT Contracted / Agent status</p>
                  <div className="grid grid-cols-4 gap-1.5 w-full">
                    {[0, 1, 2, 3].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setWholesaleTradeTier(tier)}
                        className={`py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all border ${
                          wholesaleTradeTier === tier 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {tier === 0 ? 'None' : `T${tier}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
            <Button 
              variant="ghost" 
              onClick={() => setSettingsOpen(false)} 
              className="flex-1 h-14 text-white hover:bg-white/5 rounded-full font-bold text-lg"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSettings}
              className="flex-1 h-14 bg-primary text-primary-foreground font-black rounded-full text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Settings"}
              {!isSaving && <Check className="ml-2 w-5 h-5" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
