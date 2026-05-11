
"use client"

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Lodge, RoomOverride } from '@/lib/types';
import { Loader2, Save, ArrowLeft, Trash2, Image as ImageIcon, Sparkles, MapPin, Mail, RefreshCcw, Globe, Info, HelpCircle, Search, AlertCircle, Compass } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { format, addDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ADMIN_EMAILS = ['reservations@amakhala.com', 'terry_collinson@debono.net'];

const AVAILABLE_AMENITIES = [
  "Wifi",
  "Pool",
  "All-Inclusive",
  "Private Plunge Pool",
  "Air Conditioning",
  "Family Friendly",
  "Spa",
  "Gym",
  "Guided Safaris"
];

export default function LodgeAdminPage() {
  const { user, loading: loadingUser } = useUser();
  const { id } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!loadingUser && (!user || !ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase()))) {
      router.push('/portal');
    }
  }, [user, loadingUser, router]);
  
  const lodgeRef = useMemo(() => (db && id) ? doc(db, 'lodges', id as string) : null, [db, id]);
  const { data: lodge, loading } = useDoc<Lodge>(lodgeRef);
  
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState<Partial<Lodge>>({});

  useEffect(() => {
    if (lodge) {
      setFormData(lodge);
    }
  }, [lodge]);

  const handleSave = async () => {
    if (!lodgeRef) return;
    setSaving(true);
    
    try {
      await updateDoc(lodgeRef, {
        ...formData,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Changes Saved",
        description: `${lodge?.name} configuration has been updated successfully.`
      });
    } catch (error: any) {
      toast({
        title: "Save Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!lodge?.bookingId) {
      toast({ title: "Sync Error", description: "No Booking.com ID configured for this sanctuary.", variant: "destructive" });
      return;
    }
    syncInventory();
  };

  const syncInventory = async () => {
    setSyncing(true);
    try {
      const checkIn = format(addDays(new Date(), 180), 'yyyy-MM-dd');
      const checkOut = format(addDays(new Date(), 183), 'yyyy-MM-dd');
      
      const res = await fetch(`/api/rates?mode=sync&hotelId=${lodge?.bookingId}&arrival=${checkIn}&departure=${checkOut}&adults=2&rooms=1`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      const { metadata, blocks } = data;
      const updatedFields: Partial<Lodge> = { ...formData };
      
      if (metadata) {
        if (metadata.hotel_name) updatedFields.name = metadata.hotel_name;
        if (metadata.address) updatedFields.address = metadata.address;
        if (metadata.latitude) updatedFields.latitude = metadata.latitude;
        if (metadata.longitude) updatedFields.longitude = metadata.longitude;
      }
      
      const currentOverrides = { ...(updatedFields.adminConfig?.roomOverrides || {}) };
      let discoveredCount = 0;

      const blockArray = Array.isArray(blocks) ? blocks : [];
      blockArray.forEach((block: any) => {
        const roomName = block.room_name;
        if (roomName && !currentOverrides[roomName]) {
          currentOverrides[roomName] = {
            friendlyName: roomName, 
            description: block.meal_plan_included_name || "Premium Sanctuary Suite",
            imageUrl: ""
          };
          discoveredCount++;
        }
      });
      
      updatedFields.adminConfig = {
        ...(updatedFields.adminConfig || {}),
        roomOverrides: currentOverrides
      };
      
      setFormData(updatedFields);
      
      toast({
        title: "Discovery Successful",
        description: discoveredCount > 0 
          ? `Metadata updated. Discovered ${discoveredCount} new suite types from live inventory.` 
          : "Metadata updated. Existing mappings are up to date."
      });
    } catch (error: any) {
      toast({
        title: "Sync Engine Error",
        description: "Could not reach the inventory engine. Please check the Sanctuary ID.",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const updateAdminConfig = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      adminConfig: {
        ...(prev.adminConfig || {}),
        [key]: value
      }
    }));
  };

  const toggleAmenity = (amenity: string) => {
    const current = formData.adminConfig?.amenities || [];
    const updated = current.includes(amenity)
      ? current.filter(a => a !== amenity)
      : [...current, amenity];
    updateAdminConfig('amenities', updated);
  };

  const removeRoomOverride = (key: string) => {
    const current = { ...(formData.adminConfig?.roomOverrides || {}) };
    delete current[key];
    updateAdminConfig('roomOverrides', current);
  };

  const updateRoomField = (key: string, field: keyof RoomOverride, value: string) => {
    const current = { ...(formData.adminConfig?.roomOverrides || {}) };
    current[key] = {
      ...current[key],
      [field]: value
    };
    updateAdminConfig('roomOverrides', current);
  };

  if (loadingUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase())) {
    return null;
  }

  if (!lodge) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-xl text-muted-foreground italic">Sanctuary profile not found.</p>
        <Button variant="outline" onClick={() => router.push('/admin')}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-24 text-foreground bg-background">
      <Navbar />
      
      <div className="pt-32 pb-12 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin')} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-headline font-bold">{lodge.name}</h1>
              <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[10px] mt-1">
                <MapPin className="w-3 h-3" />
                <span>Sanctuary Management Dashboard</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              onClick={handleSync} 
              disabled={syncing} 
              className="border-white/10 hover:border-primary/50 text-xs font-bold uppercase h-12 px-6 rounded-full group bg-white/5"
            >
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />}
              Sync & Discover Suites
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="flex-1 md:flex-none bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 h-12 font-bold group shadow-lg shadow-primary/20"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />}
              Save All Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          <Card className="glass-card border-white/5 bg-black/40">
            <CardHeader>
              <CardTitle className="text-xl font-headline italic flex items-center gap-2 text-white">
                <Sparkles className="text-primary w-5 h-5" />
                Sanctuary Branding & Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Global Hero Image URL</Label>
                  <input
                    type="text"
                    value={formData.adminConfig?.heroImage || ""} 
                    onChange={(e) => updateAdminConfig('heroImage', e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Official Contact Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.adminConfig?.contactEmail || ""} 
                      onChange={(e) => updateAdminConfig('contactEmail', e.target.value)}
                      placeholder="reservations@sanctuary.com"
                      className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                 <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Sanctuary Region</Label>
                    <div className="relative">
                      <Compass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={formData.region || ""} 
                        onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                        placeholder="e.g. Amakhala"
                        className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Sanctuary Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={formData.address || ""} 
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="R342, Amakhala Game Reserve..."
                        className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Lat</Label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude?.toString() || ""} 
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                      className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Lng</Label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude?.toString() || ""} 
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                      className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Sanctuary Amenities</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {AVAILABLE_AMENITIES.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-3 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer group" onClick={() => toggleAmenity(amenity)}>
                      <Checkbox 
                        id={amenity} 
                        checked={formData.adminConfig?.amenities?.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label htmlFor={amenity} className="text-xs font-bold leading-none cursor-pointer text-white/80 group-hover:text-white transition-colors">{amenity}</label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/5 bg-black/40">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-headline italic flex items-center gap-2 text-white">
                    <ImageIcon className="text-primary w-5 h-5" />
                    Premium Room Mapper
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Replace technical strings with high-fidelity suite titles</p>
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <div className="p-2 bg-white/5 rounded-full cursor-help hover:bg-white/10 transition-colors">
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                         </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-popover border-white/10 text-[10px] w-64 p-4 shadow-2xl leading-relaxed">
                        <strong>The Discovery Workflow:</strong><br/><br/>
                        1. Click <strong>'Sync & Discover Suites'</strong> above.<br/>
                        2. The system fetches live inventory from Booking.com.<br/>
                        3. All unique room types appear here automatically.<br/>
                        4. Rebrand them with premium names and custom images.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(!formData.adminConfig?.roomOverrides || Object.keys(formData.adminConfig.roomOverrides).length === 0) ? (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl text-muted-foreground italic flex flex-col items-center gap-6">
                  <div className="p-6 bg-white/5 rounded-full">
                    <Search className="w-10 h-10 text-muted-foreground opacity-30" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-headline">No Suites Discovered Yet</p>
                    <p className="text-xs max-w-xs mx-auto">Click <strong>'Sync & Discover Suites'</strong> above to identify live inventory for this sanctuary.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(formData.adminConfig.roomOverrides).map(([key, override]) => (
                    <div key={key} className="p-8 bg-black/40 rounded-3xl border border-white/10 space-y-6 relative group hover:border-primary/20 transition-all">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => removeRoomOverride(key)}
                        className="absolute top-6 right-6 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      
                      <div className="flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-1/3 aspect-[16/9] bg-white/5 rounded-2xl overflow-hidden relative border border-white/5 shadow-inner">
                          {override.imageUrl ? (
                            <Image src={override.imageUrl} alt={key} fill className="object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] text-muted-foreground uppercase font-bold text-center p-6 gap-2">
                              <ImageIcon className="w-6 h-6 opacity-20" />
                              <span>No Suite Image</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-6">
                          <div>
                            <p className="text-[10px] text-primary uppercase font-bold tracking-[0.2em] mb-2 flex items-center gap-2">
                              API Reference (Technical Key)
                              <Info className="w-3 h-3 text-muted-foreground opacity-50" />
                            </p>
                            <p className="text-xs font-mono text-white/50 bg-white/5 p-3 rounded-xl border border-white/5 select-all">{key}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase tracking-widest font-bold text-white/60">Premium Suite Title</Label>
                              <input
                                type="text"
                                value={override.friendlyName}
                                onChange={(e) => updateRoomField(key, 'friendlyName', e.target.value)}
                                placeholder="e.g. The King Cheetah Sanctuary Suite"
                                className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase tracking-widest font-bold text-white/60">Suite Gallery URL</Label>
                              <input
                                type="text"
                                value={override.imageUrl}
                                onChange={(e) => updateRoomField(key, 'imageUrl', e.target.value)}
                                placeholder="https://images.unsplash.com/..."
                                className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest font-bold text-white/60">Suite Marketing Narrative</Label>
                            <input
                              type="text"
                              value={override.description}
                              onChange={(e) => updateRoomField(key, 'description', e.target.value)}
                              placeholder="Describe the experience, the view, or the luxury features..."
                              className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card border-white/5 bg-black/40 sticky top-32 shadow-2xl overflow-hidden">
            <div className="h-2 bg-primary" />
            <CardHeader>
              <CardTitle className="text-lg font-headline italic text-white flex items-center gap-2">
                 <Globe className="w-4 h-4 text-primary" />
                 Live Portal Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl">
                {formData.adminConfig?.heroImage ? (
                  <Image src={formData.adminConfig.heroImage} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-white/5 flex items-center justify-center text-muted-foreground italic text-xs">Waiting for Hero Imagery</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 pr-6">
                  <h4 className="text-2xl font-headline font-bold text-white leading-tight">{formData.name || (lodge ? lodge.name : 'Sanctuary Name')}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">{lodge ? lodge.category : 'Luxury'}</p>
                    {formData.region && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] border-l border-white/20 pl-2">{formData.region}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="flex items-start gap-3 text-xs text-white/70">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{formData.address || 'Location metadata pending sync'}</span>
                 </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">Active Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {formData.adminConfig?.amenities?.map(a => (
                    <div key={a} className="bg-primary/10 text-primary text-[9px] font-bold px-3 py-1.5 rounded-lg border border-primary/20 uppercase tracking-wider">
                      {a}
                    </div>
                  ))}
                  {(!formData.adminConfig?.amenities || formData.adminConfig.amenities.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">No amenities mapped yet.</p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">
                  Inventory State
                </p>
                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                  {Object.keys(formData.adminConfig?.roomOverrides || {}).length} Mapped Suites
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
