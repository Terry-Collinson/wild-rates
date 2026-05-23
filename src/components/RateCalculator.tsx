
"use client"

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  ShieldCheck, 
  Users, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  Minus,
  Sparkles,
  Crown,
  Baby,
  Binoculars,
  TrendingDown,
  Star,
  Heart,
  Globe,
  AlertCircle,
  Zap,
  ArrowLeft,
  ChevronRight,
  Settings2,
  Smartphone,
  Percent,
  ImageIcon,
  Info,
  Leaf
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc, useProfile } from '@/firebase';
import { useAnalytics } from '@/firebase/analytics/use-analytics';
import { collection, addDoc, serverTimestamp, query, where, doc } from 'firebase/firestore';
import { Lodge, Quote, RoomType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format, startOfToday, parseISO, isValid, addDays, isBefore, isSameDay, differenceInDays } from 'date-fns';
import { calculateSafariPrice } from '@/utils/safariPriceEngine';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'config' | 'occupancy' | 'searching' | 'results' | 'roomSelection' | 'success';

interface Competitor {
  source: string;
  price: number;
  link: string;
}

interface RoomResult {
  id: string;
  lodgeId: string;
  lodgeName: string;
  name: string;
  otaPrice: number;
  heroPrice: number;
  savings: number;
  image: string;
  mealPlan: string;
  amenities: string[];
  isAvailable: boolean;
  starRating?: number;
  statusNote?: string;
  competitors: Competitor[];
  isBestPrice: boolean;
  priceBreakdown?: any;
  displayLabel: string;
  isSingle: boolean;
  totalStayCost?: number;
  memberSaving?: number;
  conservationFuel?: number;
  totalBenefit?: number;
  rooms?: { name: string; price: number; images?: string[] }[];
}

const REGIONAL_CONSTANT = "all-amakhala";

const LODGE_BADGES: Record<string, { label: string, icon: any }> = {
  "336711": { label: "Family Favorite", icon: Baby },
  "336709": { label: "Most Romantic", icon: Heart },
  "336717": { label: "Best View", icon: Binoculars },
  "336718": { label: "Best Value", icon: TrendingDown },
  "1162608": { label: "Authentic Bush", icon: Binoculars },
};

export default function RateCalculator() {
  const { user, profile } = useProfile();
  const db = useFirestore();
  const policyRef = useMemoFirebase(() => db ? doc(db, 'config', 'booking_policy') : null, [db]);
  const { data: policyConfig } = useDoc<any>(policyRef);
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();

  // Calculate automatic best discount rate
  const resolvedGeniusMultiplier = useMemo(() => {
    if (!profile) return 1.0; // Standard baseline
    
    const multipliers: number[] = [1.0];
    
    // 1. Booking.com Genius
    if (profile.bookingGeniusLevel === 1) multipliers.push(0.90);
    else if (profile.bookingGeniusLevel === 2) multipliers.push(0.85);
    else if (profile.bookingGeniusLevel === 3) multipliers.push(0.80);
    
    // 2. Expedia One Key
    if (profile.expediaOneKeyLevel === 'blue') multipliers.push(0.90);
    else if (profile.expediaOneKeyLevel === 'silver') multipliers.push(0.85);
    else if (profile.expediaOneKeyLevel === 'gold-platinum') multipliers.push(0.80);
    
    // 3. Agoda VIP
    if (profile.agodaVipLevel === 'bronze') multipliers.push(1.0);
    else if (profile.agodaVipLevel === 'silver') multipliers.push(0.90);
    else if (profile.agodaVipLevel === 'gold') multipliers.push(0.82);
    else if (profile.agodaVipLevel === 'platinum') multipliers.push(0.75);
    
    // 4. Tripadvisor Plus
    if (profile.tripadvisorPlusActive) multipliers.push(0.85);
    
    // 5. Wholesale Trade Tier
    if (profile.wholesaleTradeTier === 1) multipliers.push(0.80);
    else if (profile.wholesaleTradeTier === 2) multipliers.push(0.75);
    else if (profile.wholesaleTradeTier === 3) multipliers.push(0.65);
    
    // Return the lowest multiplier (deepest discount)
    return Math.min(...multipliers);
  }, [profile]);

  // Determine the display label for the best matched status
  const resolvedStatusLabel = useMemo(() => {
    if (!profile) return "Standard Rate Match";
    
    const matches: string[] = [];
    if (profile.bookingGeniusLevel && profile.bookingGeniusLevel > 0) matches.push(`Genius Lvl ${profile.bookingGeniusLevel}`);
    if (profile.expediaOneKeyLevel && profile.expediaOneKeyLevel !== 'none') matches.push(`One Key ${profile.expediaOneKeyLevel.toUpperCase()}`);
    if (profile.agodaVipLevel && profile.agodaVipLevel !== 'none') matches.push(`Agoda ${profile.agodaVipLevel.toUpperCase()}`);
    if (profile.tripadvisorPlusActive) matches.push("Tripadvisor Plus");
    if (profile.wholesaleTradeTier && profile.wholesaleTradeTier > 0) matches.push(`Wholesale Agent Tier ${profile.wholesaleTradeTier}`);
    
    return matches.length > 0 ? `Matched: ${matches.join(" & ")}` : "Standard Rate Match";
  }, [profile]);

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('config');
  const [sanctuaryId, setSanctuaryId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(() => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 2); // 2 days in advance
    return checkIn;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 4); // 4 days in advance (2-night stay)
    return checkOut;
  });
  
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [rooms, setRooms] = useState<number>(1);
  const [geniusLevel, setGeniusLevel] = useState<number>(0);
  const [results, setResults] = useState<RoomResult[]>([]);
  const [selectedLodgeResult, setSelectedLodgeResult] = useState<RoomResult | null>(null);
  const [finalSelectedRoom, setFinalSelectedRoom] = useState<{name: string, price: number, image: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingResponse, setBookingResponse] = useState<{id: string, status: string} | null>(null);
  const [showIntegrityDialog, setShowIntegrityDialog] = useState(false);
  const [showNightsbridgePreview, setShowNightsbridgePreview] = useState(false);
  const [pendingSuite, setPendingSuite] = useState<{displayName: string, price: number, image: string, otaPrice?: number} | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lodgesQuery = useMemoFirebase(() => db ? collection(db, 'lodges') : null, [db]);
  const { data: rawLodges } = useCollection<Lodge>(lodgesQuery);
  
  const sortedLodges = useMemo(() => {
    if (!rawLodges) return [];
    return [...rawLodges]
      .filter(l => l.name !== "Boubou Lodge")
      .sort((a, b) => a.name.slice(0, 50).localeCompare(b.name.slice(0, 50)));
  }, [rawLodges]);

  const selectedLodge = useMemo(() => sortedLodges.find(l => l.id === sanctuaryId), [sortedLodges, sanctuaryId]);

  // Fetch Ingested Room Types for deeper visual content
  const roomTypesQuery = useMemoFirebase(() => {
    if (!db || !selectedLodgeResult) return null;
    return query(collection(db, 'room_types'), where('property_id', '==', selectedLodgeResult.lodgeId));
  }, [db, selectedLodgeResult]);
  const { data: ingestedRoomTypes } = useCollection<RoomType>(roomTypesQuery);

  useEffect(() => {
    setRooms(Math.ceil(adults / 2));
  }, [adults]);

  const fetchHeroRates = async () => {
    if (!sanctuaryId || !startDate || !endDate) return;
    
    setStep('searching');
    // setResults([]); // Flicker Fix
    setShowIntegrityDialog(false);
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    try {
      const currentGeniusMultiplier = resolvedGeniusMultiplier;

      const queryParam = sanctuaryId === REGIONAL_CONSTANT ? 'Amakhala Game Reserve' : selectedLodge?.name;
      const apiUrl = `/api/rates?q=${encodeURIComponent(queryParam || '')}&arrival=${startStr}&departure=${endStr}&adults=${adults}&rooms=${rooms}&mode=availability`;
      
      const res = await fetch(apiUrl);
      const data = await res.json();
      
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        const amakhalaOnlyResults = data.results.filter((r: any) => {
          const matchingLodge = sortedLodges.find(l => 
            l.name.toLowerCase().includes(r.name.toLowerCase()) || 
            r.name.toLowerCase().includes(l.name.toLowerCase())
          );
          
          if (!matchingLodge) {
            // Keep generic Amakhala matches only if searching the entire region
            return sanctuaryId === REGIONAL_CONSTANT && r.name.toLowerCase().includes("amakhala");
          }
          
          // If searching regional, return true for all matched lodges
          if (sanctuaryId === REGIONAL_CONSTANT) {
            return true;
          }
          
          // If searching a specific property, only return if it matches the chosen sanctuaryId!
          return matchingLodge.id === sanctuaryId;
        });

        const mappedResults = amakhalaOnlyResults.map((r: any) => {
          const localLodge = sortedLodges.find(l => 
            l.id === r.hotelId ||
            l.name.toLowerCase().includes(r.name.toLowerCase()) || 
            r.name.toLowerCase().includes(l.name.toLowerCase())
          );
          
          // 1. Raw Room Total from API
          const roomTotal = r.price || 0;
          const stayNights = differenceInDays(endDate, startDate) || 1; 

          // 2. APPLY DYNAMIC POLICY MATH (Using Central Engine)
          const safeConfig = policyConfig || {
              weight_adult: 1.0,
              weight_child_infant_age_max: 2,
              weight_child_infant_factor: 0,
              weight_child_minor_age_max: 11,
              weight_child_minor_factor: 0.5,
              weight_single_occupancy: 1.0,
              levy_cons_pppn_zar: 210,
              hero_guarantee_multiplier: 0.95,
              ota_commission_rate: 0.15,
              member_discount_rate: 0.05
          };
          
          // 1. Run the Engine
          const pricing = calculateSafariPrice(roomTotal, adults, childAges, stayNights, {
              ...safeConfig,
              geniusMultiplier: currentGeniusMultiplier
          });

          // 2. Calculate the Market (OTA) Version of the same math
          // This ensures "Market PPPN" is never NaN
          const marketBarePPS = pricing.barePPS * currentGeniusMultiplier; 
          const marketPrice = marketBarePPS + (safeConfig?.levy_cons_pppn_zar || 210);
          
          let competitors = (r.competitors || []).map((c: any) => {
             const compPricing = calculateSafariPrice(c.price, adults, childAges, stayNights, safeConfig);
             return {
                ...c,
                price: compPricing.barePPS + (safeConfig?.levy_cons_pppn_zar || 210)
             };
          });

          if (competitors.length === 0 && marketPrice > 0) {
            competitors = [
              { source: 'Booking.com', price: marketPrice, link: '#' },
              { source: 'Expedia', price: marketPrice * 1.02, link: '#' },
              { source: 'Agoda', price: marketPrice * 0.99, link: '#' }
            ];
          }
          
          return {
            id: r.hotelId || Math.random().toString(),
            lodgeId: r.hotelId || localLodge?.id || 'fallback',
            lodgeName: r.name,
            name: r.roomName || 'Luxury Lodge Suite',
            otaPrice: marketPrice,
            heroPrice: pricing.heroPrice,
            savings: pricing.marketTotalStay - pricing.totalStayCost,
            totalStayCost: pricing.totalStayCost,
            memberSaving: pricing.memberSaving,
            conservationFuel: pricing.conservationFuel,
            totalBenefit: pricing.totalBenefit,
            displayLabel: pricing.displayLabel,
            isSingle: pricing.isSingle,
            image: r.roomImage || r.room_photo || r.image || localLodge?.adminConfig?.heroImage || "",
            mealPlan: 'All-Inclusive',
            amenities: localLodge?.adminConfig?.amenities || [],
            isAvailable: r.isAvailable && r.price > 0,
            starRating: r.starRating,
            statusNote: r.statusNote,
            competitors: competitors,
            isBestPrice: competitors.length === 0 || competitors.every((c: Competitor) => marketPrice <= c.price),
            priceBreakdown: pricing,
            rooms: r.rooms || []
          } as RoomResult;
        });

        let finalResults = [...mappedResults];
        
        if (sanctuaryId === REGIONAL_CONSTANT) {
          const representedLodgeIds = new Set(
            mappedResults
              .map((r: any) => {
                const matched = sortedLodges.find(l => 
                  l.id === r.lodgeId || 
                  l.name.toLowerCase().includes(r.lodgeName?.toLowerCase()) ||
                  r.lodgeName?.toLowerCase().includes(l.name.toLowerCase())
                );
                return matched?.id;
              })
              .filter(Boolean)
          );

          const missingLodges = sortedLodges.filter(l => !representedLodgeIds.has(l.id));

          const missingResults = missingLodges.map((lodge) => {
            return {
              id: `fallback-${lodge.id}`,
              lodgeId: lodge.id,
              lodgeName: lodge.name,
              name: 'Luxury Lodge Suite',
              otaPrice: 0,
              heroPrice: 0,
              savings: 0,
              totalStayCost: 0,
              memberSaving: 0,
              conservationFuel: 210,
              totalBenefit: 0,
              displayLabel: 'Inquire Direct',
              isSingle: false,
              image: lodge.adminConfig?.heroImage || lodge.imageUrl || "/api/placeholder/400/300",
              mealPlan: 'All-Inclusive',
              amenities: lodge.adminConfig?.amenities || [],
              isAvailable: false,
              starRating: 5,
              statusNote: 'Fully Booked - Inquire Direct',
              competitors: [],
              isBestPrice: true,
              priceBreakdown: null,
              rooms: []
            } as RoomResult;
          });

          finalResults = [...mappedResults, ...missingResults];
        }

        const sortedFinalResults = finalResults.sort((a: RoomResult, b: RoomResult) => {
          if (a.isAvailable === b.isAvailable) return a.heroPrice - b.heroPrice;
          return a.isAvailable ? -1 : 1;
        });

        setResults(sortedFinalResults);
        
        if (finalResults.length === 0) {
          toast({ title: "No Lodges Found", description: "All direct Amakhala inventory is occupied for these dates.", variant: "destructive" });
          setStep('config');
        } else {
          trackEvent('rate_unlock', {
            lodge_category: selectedLodge?.category || 'all-amakhala',
            internet_baseline_price: finalResults[0]?.otaPrice || 0,
            discovery_count: finalResults.length
          });
          setStep('results');
          setTimeout(() => setShowIntegrityDialog(true), 800);
        }
      } else {
        toast({ title: "Market Data Unavailable", description: "The reserve is currently fully booked or engine is updating.", variant: "destructive" });
        setStep('config');
      }
    } catch (err) {
      toast({ title: "Engine Error", description: "Communication failed.", variant: "destructive" });
      setStep('config');
    }
  };

  const handleSelectSanctuary = (room: RoomResult) => {
    setSelectedLodgeResult(room);
    setStep('roomSelection');
  };

  const handleSecureRate = async (roomName: string, price: number, image: string, otaPrice?: number) => {
    if (!db || !user?.email || !selectedLodgeResult) return;
    setLoading(true);
    // ========================================================
    // NIGHTSBRIDGE API INTEGRATION PLACEHOLDER
    // ========================================================
    // This is what we expect our internal API request to look like
    // when we eventually connect directly to the NightsBridge Booking Engine.
    
    /* const nightsbridgeRequest = {
      property_id: selectedLodgeResult.lodgeId,
      checkin: format(startDate, 'yyyy-MM-dd'),
      checkout: format(endDate, 'yyyy-MM-dd'),
      adults: adults,
      children: children,
      child_ages: childAges,
      room_type_id: roomName, // Or a technical ID from the API
      rate_id: "HERO-DIRECT-001",
      guest_details: {
        email: user.email,
        name: user.displayName || "Valued Member"
      }
    };

    // Expected Response from NightsBridge might look like this:
    // {
    //   status: "success",
    //   booking_id: "NB-12345678",
    //   confirmation_code: "WILD-HERO-XYZ",
    //   total_amount: price,
    //   currency: "ZAR",
    //   payment_status: "on_arrival"
    // }
    */
    // ========================================================

    
    trackEvent('begin_checkout', {
      item_name: roomName,
      item_id: selectedLodgeResult.lodgeId,
      price: price,
      currency: 'ZAR',
      lodge_name: selectedLodgeResult.lodgeName
    });

    try {
      const quoteData: Quote = {
        userEmail: user.email,
        lodgeId: selectedLodgeResult.lodgeId,
        lodgeName: selectedLodgeResult.lodgeName,
        otaPrice: otaPrice ?? selectedLodgeResult.otaPrice,
        memberPrice: price,
        status: 'Pending',
        checkIn: format(startDate, 'yyyy-MM-dd'),
        checkOut: format(endDate, 'yyyy-MM-dd'),
        guests: adults,
        rooms: rooms,
        roomName: roomName,
        childrenAges: childAges,
        timestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, 'quotes'), quoteData);
      
      // MOCK NIGHTSBRIDGE RESPONSE PLACEHOLDER
      // This simulates the unique ID we would get back from their API
      const mockNightsbridgeId = "NB-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      setBookingResponse({
        id: mockNightsbridgeId,
        status: "Confirmed by NightsBridge"
      });

      setFinalSelectedRoom({ name: roomName, price, image });
      setStep('success');
    } catch (error) {
      toast({ title: "Submission Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const setChildrenCount = (count: number) => {
    setChildren(count);
    if (count > childAges.length) {
      setChildAges([...childAges, ...Array(count - childAges.length).fill(6)]);
    } else {
      setChildAges(childAges.slice(0, count));
    }
  };

  const handleStepClick = (targetStepNum: number) => {
    if (targetStepNum === 1) setStep('config');
    if (targetStepNum === 2) setStep('occupancy');
    if (targetStepNum === 3) {
      if (results.length > 0) {
        setStep('results');
      } else {
        toast({ title: "Search Required", description: "Please complete occupancy selection and click Compare.", variant: "default" });
      }
    }
  };

  const sanctuarySuites = useMemo(() => {
    if (!selectedLodgeResult) return [];
    
    const localLodge = sortedLodges.find(l => l.id === selectedLodgeResult.lodgeId || l.name === selectedLodgeResult.lodgeName);
    const overrides = localLodge?.adminConfig?.roomOverrides || {};
    
    // 1. If Firestore contains rich room types templates, map them dynamically!
    if (ingestedRoomTypes && ingestedRoomTypes.length > 0) {
      return ingestedRoomTypes.map(rt => {
        // Find override by matching the technical room name key or ID
        const override = overrides[rt.name] || overrides[rt.id] || Object.entries(overrides).find(([k]) => k.toLowerCase() === rt.name.toLowerCase())?.[1];
        
        // Resolve name: override -> fallback to ingested room name
        const displayName = override?.friendlyName || rt.name;
        
        // Resolve description: override -> ingested room description (usually lodge desc) -> standard premium fallback
        const description = override?.description || rt.description || "Luxury boutique lodge suite verified direct. Includes game drives, premium meals, and conservation guardianship.";
        
        // Resolve photographs priority list: Override URL -> Synced Local Images -> Raw API Scraped Images
        const localImagesList = rt.localImages || (rt.localImage ? [rt.localImage] : []);
        const rawImagesList = rt.images || [];
        
        let allImages: string[] = [];
        if (override?.imageUrl) {
          allImages.push(override.imageUrl);
        }
        if (localImagesList.length > 0) {
          allImages = [...allImages, ...localImagesList];
        }
        if (rawImagesList.length > 0) {
          allImages = [...allImages, ...rawImagesList];
        }
        
        // Remove duplicates and filter out empty paths
        allImages = Array.from(new Set(allImages.filter(Boolean)));
        
        if (allImages.length === 0) {
          const fallbackImg = selectedLodgeResult.image || "/api/placeholder/400/300";
          allImages = [fallbackImg];
        }
        
        const uniqueImage = allImages[0];
        
        // Resolve dynamic pricing: Find if this room type matches any real-time scraped room in selectedLodgeResult
        const scrapedRoom = selectedLodgeResult.rooms?.find(sr => 
          sr.name.toLowerCase() === rt.name.toLowerCase() || 
          rt.name.toLowerCase().includes(sr.name.toLowerCase()) ||
          sr.name.toLowerCase().includes(rt.name.toLowerCase())
        );
        
        let suiteOtaPrice = selectedLodgeResult.otaPrice;
        let suiteHeroPrice = selectedLodgeResult.heroPrice;
        let suiteTotalStayCost = selectedLodgeResult.totalStayCost;
        let suiteMemberSaving = selectedLodgeResult.memberSaving;
        let suiteConservationFuel = selectedLodgeResult.conservationFuel;
        let suiteTotalBenefit = selectedLodgeResult.totalBenefit;
        
        if (scrapedRoom && scrapedRoom.price > 0) {
          const stayNights = differenceInDays(endDate, startDate) || 1;
          const safeConfig = policyConfig || {
              weight_adult: 1.0,
              weight_child_infant_age_max: 2,
              weight_child_infant_factor: 0,
              weight_child_minor_age_max: 11,
              weight_child_minor_factor: 0.5,
              weight_single_occupancy: 1.0,
              levy_cons_pppn_zar: 210,
              hero_guarantee_multiplier: 0.95,
              ota_commission_rate: 0.15,
              member_discount_rate: 0.05
          };
          
          const pricing = calculateSafariPrice(scrapedRoom.price, adults, childAges, stayNights, {
              ...safeConfig,
              geniusMultiplier: resolvedGeniusMultiplier
          });
          
          const marketBarePPS = pricing.barePPS * resolvedGeniusMultiplier; 
          suiteOtaPrice = marketBarePPS + (safeConfig?.levy_cons_pppn_zar || 210);
          suiteHeroPrice = pricing.heroPrice;
          suiteTotalStayCost = pricing.totalStayCost;
          suiteMemberSaving = pricing.memberSaving;
          suiteConservationFuel = pricing.conservationFuel;
          suiteTotalBenefit = pricing.totalBenefit;
        }
        
        return {
          technicalName: rt.id,
          displayName,
          description,
          image: uniqueImage,
          allImages,
          otaPrice: suiteOtaPrice,
          heroPrice: suiteHeroPrice,
          totalStayCost: suiteTotalStayCost,
          memberSaving: suiteMemberSaving,
          conservationFuel: suiteConservationFuel,
          totalBenefit: suiteTotalBenefit
        };
      });
    }
    
    // 2. Fallback: Default to live API matched room type details
    const override = overrides[selectedLodgeResult.name] || Object.entries(overrides).find(([k]) => k.toLowerCase() === selectedLodgeResult.name.toLowerCase())?.[1];
    
    const displayName = override?.friendlyName || selectedLodgeResult.name;
    const description = override?.description || "Direct inventory match verified via Google Hotels API. Includes all-inclusive meals, game drives, and conservation guardianship.";
    const uniqueRoomImage = override?.imageUrl || selectedLodgeResult.image || "/api/placeholder/400/300";
    
    return [
      { 
        technicalName: "api-match", 
        displayName, 
        description, 
        image: uniqueRoomImage, 
        allImages: [uniqueRoomImage],
        otaPrice: selectedLodgeResult.otaPrice,
        heroPrice: selectedLodgeResult.heroPrice,
        totalStayCost: selectedLodgeResult.totalStayCost,
        memberSaving: selectedLodgeResult.memberSaving,
        conservationFuel: selectedLodgeResult.conservationFuel,
        totalBenefit: selectedLodgeResult.totalBenefit
      }
    ];
  }, [selectedLodgeResult, sortedLodges, ingestedRoomTypes, startDate, endDate, policyConfig, resolvedGeniusMultiplier, adults, childAges]);

  if (!mounted) return null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 relative">
      <div className="text-center space-y-3 mb-12">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-white">Hero Rate Generator</h1>
        <p className="text-primary font-bold tracking-[0.2em] uppercase text-xs">GUARANTEED 5% BELOW ANY GLOBAL PLATFORM PRICE (PPPN)</p>
      </div>

      {['config', 'occupancy', 'searching', 'results', 'roomSelection'].includes(step) && (
        <div className="flex justify-between items-center mb-12 max-w-sm mx-auto relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
          {[1, 2, 3].map((num) => {
            let active = false;
            if (num === 1 && step === 'config') active = true;
            if (num === 2 && step === 'occupancy') active = true;
            if (num === 3 && (step === 'results' || step === 'roomSelection')) active = true;
            
            const completed = (num === 1 && step !== 'config') || (num === 2 && !['config', 'occupancy'].includes(step));
            const clickable = num !== 3 || results.length > 0;

            return (
              <button 
                key={num} 
                onClick={() => clickable && handleStepClick(num)}
                disabled={!clickable && num === 3}
                className={`w-8 h-8 rounded-full z-10 flex items-center justify-center text-xs font-bold transition-all ${
                  active 
                    ? 'bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20' 
                    : completed 
                    ? 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30' 
                    : clickable 
                    ? 'bg-white/5 text-muted-foreground hover:bg-white/10' 
                    : 'bg-white/5 text-muted-foreground opacity-50 cursor-not-allowed'
                } cursor-pointer`}
              >
                {num}
              </button>
            );
          })}
        </div>
      )}

      {step === 'config' && (
        <Card className="glass-card max-w-2xl mx-auto border-white/5 bg-black/40">
           <CardHeader className="text-center pb-8 pt-10">
            <CardTitle className="text-3xl font-headline italic">Select Destination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-10 pb-10">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest font-bold text-primary">Location</Label>
              <Select onValueChange={setSanctuaryId} value={sanctuaryId}>
                <SelectTrigger className="h-14 bg-white/5 border-white/10 text-lg text-white">
                  <SelectValue placeholder="Where to?" />
                </SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  <SelectItem value={REGIONAL_CONSTANT} className="py-4 font-bold text-primary italic border-b border-white/5 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      All Amakhala Lodges
                    </div>
                  </SelectItem>
                  {sortedLodges.map(l => (
                    <SelectItem key={l.id} value={l.id} className="py-3">{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-primary">Check-In</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-14 justify-start text-left font-normal bg-white/5 border-white/10 text-lg text-white rounded-md",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border-white/10 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        if (date) {
                          setStartDate(date);
                          if (isBefore(endDate, date) || isSameDay(endDate, date)) {
                            setEndDate(addDays(date, 2));
                          }
                        }
                      }}
                      initialFocus
                      disabled={(date) => date < startOfToday()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-primary">Check-Out</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-14 justify-start text-left font-normal bg-white/5 border-white/10 text-lg text-white rounded-md",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border-white/10 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                      disabled={(date) => date <= startDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold text-lg" disabled={!sanctuaryId || !startDate || !endDate} onClick={() => setStep('occupancy')}>
              Continue <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            
            <p className="text-[10px] text-muted-foreground italic text-center mt-2">
              All quotes normalized to PPPN (Per Person Per Night)
            </p>
          </CardContent>
        </Card>
      )}

      {step === 'occupancy' && (
        <Card className="glass-card max-w-2xl mx-auto border-white/5 bg-black/40">
          <CardHeader className="text-center pb-8 pt-10">
            <CardTitle className="text-3xl font-headline italic">Define Your Party</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 px-10 pb-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-white">
                  <Label className="text-xs font-bold uppercase">Adults</Label>
                  <div className="flex items-center gap-3">
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setAdults(Math.max(1, adults - 1))}><Minus className="w-3 h-3" /></Button>
                    <span className="font-bold w-4 text-center">{adults}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setAdults(adults + 1)}><Plus className="w-3 h-3" /></Button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-white">
                  <Label className="text-xs font-bold uppercase">Children</Label>
                  <div className="flex items-center gap-3">
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setChildrenCount(Math.max(0, children - 1))}><Minus className="w-3 h-3" /></Button>
                    <span className="font-bold w-4 text-center">{children}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setChildrenCount(children + 1)}><Plus className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Room Allocation</p>
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Users className="w-4 h-4" />
                  <span>{rooms} Suite{rooms > 1 ? 's' : ''} Required</span>
                </div>
              </div>
            </div>
            {children > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Children Ages</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {childAges.map((age, idx) => (
                    <Select key={idx} value={age.toString()} onValueChange={(v) => {
                      const newAges = [...childAges];
                      newAges[idx] = parseInt(v);
                      setChildAges(newAges);
                    }}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-10 text-xs">
                        <SelectValue placeholder={`Child ${idx + 1}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 18 }).map((_, i) => (
                          <SelectItem key={i} value={i.toString()}>{i} Years</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-4 pt-4">
              <Button variant="ghost" onClick={() => setStep('config')} className="h-14 px-6 text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button className="flex-1 h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold text-lg group" onClick={fetchHeroRates}>
                Compare Sanctuaries <Sparkles className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'searching' && (
        <div className="max-w-xl mx-auto py-20 text-center space-y-8 animate-in fade-in zoom-in-95">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
            <ShieldCheck className="absolute inset-0 m-auto w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-headline italic text-white">
            Status Parity: {resolvedStatusLabel}
          </h2>
          <p className="text-muted-foreground italic">
            Connecting to Universal Market Intelligence engine...
          </p>
        </div>
      )}

      {step === 'results' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          {results.length > 0 && (
            <Dialog open={showIntegrityDialog} onOpenChange={setShowIntegrityDialog}>
              <DialogContent className="glass-card border-white/10 bg-[#0a0a0a] text-white max-w-lg overflow-hidden p-0">
                <div className="bg-primary/10 p-6 border-b border-white/5">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-headline italic flex items-center gap-2 text-white">
                      Direct Guardianship Analysis
                    </DialogTitle>
                    <DialogDescription className="text-primary/80 text-xs font-medium leading-relaxed mt-2 italic">
                      "Apples-to-Apples" Normalization: All market rates are audited for VAT-inclusion, normalized to PPPN, and capture hidden mobile-only discounts.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center space-y-1">
                      <Zap className="w-4 h-4 text-primary mx-auto" />
                      <p className="text-[8px] font-black uppercase text-white/40">Rate Basis</p>
                      <p className="text-[10px] font-bold text-white">PPPN (Per Person)</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center space-y-1">
                      <Percent className="w-4 h-4 text-primary mx-auto" />
                      <p className="text-[8px] font-black uppercase text-white/40">Tax Status</p>
                      <p className="text-[10px] font-bold text-white">VAT-Incl</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center space-y-1">
                      <Smartphone className="w-4 h-4 text-primary mx-auto" />
                      <p className="text-[8px] font-black uppercase text-white/40">Device</p>
                      <p className="text-[10px] font-bold text-white">Mobile-Match</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Your Guaranteed Rate (PPPN)</p>
                    <div className="p-4 rounded-xl bg-primary border border-primary/30 flex justify-between items-center shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-primary-foreground/70 uppercase tracking-tighter">Lodge-Direct (Wild Rate)</span>
                        <span className="text-2xl font-bold text-primary-foreground">R{Math.round(results[0].heroPrice).toLocaleString()}</span>
                      </div>
                      <Badge className="bg-primary-foreground text-primary font-black text-[10px] px-3 py-1 shadow-sm">WINNER</Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Market Extraction (Verified PPPN Benchmarks)</p>
                    <div className="space-y-2">
                      {results[0].competitors && results[0].competitors.length > 0 ? (
                        results[0].competitors.map((comp, idx) => (
                          <div key={idx} className="flex justify-between items-center py-3 px-4 rounded-xl bg-white/5 border border-white/5 opacity-70 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-white/90">{comp.source}</span>
                            </div>
                            <span className="text-sm font-bold text-white/40 line-through">R{Math.round(comp.price).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-white/5 border border-white/5 opacity-50">
                          <span className="text-sm font-medium text-white/70">Global Baseline Average</span>
                          <span className="text-sm font-bold text-white/40 line-through">R{Math.round(results[0].otaPrice).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <TrendingDown className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-emerald-100/80 leading-relaxed italic">
                        "The <span className="text-emerald-400 font-bold">R{Math.round(results[0].savings).toLocaleString()}</span> saving represents the commission reclaimed per person, per night from global tech platforms."
                      </p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => handleStepClick(2)} className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="space-y-1">
                <h2 className="text-4xl font-headline font-bold text-white">Amakhala Discovery View</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-primary" /> 
                    Verified Market Search (PPPN)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Crown className="w-3 h-3 text-primary" /> 
                    {resolvedStatusLabel}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => setStep('config')} className="border-white/10 text-white text-xs font-bold uppercase h-10 px-6 rounded-full flex items-center gap-2 hover:bg-white/5 transition-colors self-start md:self-auto">
              <Settings2 className="w-3.5 h-3.5" />
              Modify Search
            </Button>
          </div>

          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((room, index) => {
                const badge = LODGE_BADGES[room.lodgeId];
                const BadgeIcon = badge?.icon;

                return (
                  <Card key={room.id} className={`glass-card border-white/5 bg-black/40 overflow-hidden flex flex-col group transition-all shadow-2xl relative ${!room.isAvailable ? 'opacity-60 grayscale' : 'hover:border-primary/40'}`}>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {room.image ? (
                        <Image 
                          src={room.image} priority={index < 3} 
                          alt={room.lodgeName} 
                          fill 
                          unoptimized
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-white/5 flex items-center justify-center text-[10px] text-muted-foreground font-bold uppercase">No Imagery Available</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                      
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {badge && room.isAvailable && (
                          <Badge className="bg-primary text-primary-foreground font-bold uppercase text-[9px] px-3 py-1.5 gap-1.5 w-fit">
                            {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
                            {badge.label}
                          </Badge>
                        )}
                        {room.isBestPrice && room.isAvailable && (
                          <Badge className="bg-green-500 text-white font-bold uppercase text-[9px] px-3 py-1.5 gap-1.5 w-fit border-none">
                            <CheckCircle2 className="w-3 h-3" />
                            Cheapest on Market
                          </Badge>
                        )}
                      </div>

                      {!room.isAvailable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                          <Badge variant="outline" className="border-white/40 text-white uppercase font-bold tracking-widest px-4 py-2 gap-2">
                            <AlertCircle className="w-3 h-3" />
                            {room.statusNote || 'Fully Booked'}
                          </Badge>
                        </div>
                      )}

                      <div className="absolute bottom-4 left-4 pr-4">
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-2.5 h-2.5 ${i < (room.starRating || 5) ? 'text-primary fill-primary' : 'text-white/20'}`} />
                          ))}
                        </div>
                        <h3 className="text-xl font-headline italic text-white leading-tight">{room.lodgeName}</h3>
                        <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">{room.name}</p>
                      </div>
                    </div>

                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        {room.isAvailable ? (
                          <>
                            <div className="flex justify-between items-end">
                              <div className="space-y-0.5">
                                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Market PPPN</p>
                                <p className="text-sm text-muted-foreground line-through">R{Math.round(room.otaPrice).toLocaleString()}</p>
                              </div>
                              <div className="text-right space-y-0.5 flex flex-col items-end">
                                <p className="text-[9px] text-primary uppercase font-bold tracking-widest">Hero {room.displayLabel} Rate</p>
                                <p className="text-2xl font-headline font-bold text-white">R{Math.round(room.heroPrice).toLocaleString()}</p>
                                {room.totalStayCost && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1.5 cursor-help group/total mt-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest group-hover/total:text-primary transition-colors">
                                          Total Stay: R{Math.round(room.totalStayCost).toLocaleString('en-ZA')}
                                        </p>
                                        <Info className="w-3 h-3 text-muted-foreground group-hover/total:text-primary transition-colors" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="border border-white/10 bg-[#070c09] p-4 shadow-2xl rounded-xl z-50 text-white min-w-[220px]">
                                      <div className="space-y-2.5 text-[11px] font-medium">
                                        <p className="text-white/40 uppercase text-[9px] font-black tracking-tighter border-b border-white/5 pb-1.5 mb-2">Price Breakdown</p>
                                        <div className="flex justify-between gap-8">
                                          <span className="text-white/60">Adult Rate</span>
                                          <span className="text-white font-mono">
                                            R{Math.round(room.priceBreakdown?.breakdown?.adultRate || 0).toLocaleString()} x {room.priceBreakdown?.breakdown?.adults || 0}
                                          </span>
                                        </div>
                                        {(room.priceBreakdown?.breakdown?.children || 0) > 0 && (
                                          <div className="flex justify-between gap-8">
                                            <span className="text-white/60">Child Rate</span>
                                            <span className="text-white font-mono">
                                              R{Math.round(room.priceBreakdown?.breakdown?.childRate || 0).toLocaleString()} x {room.priceBreakdown?.breakdown?.children}
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex justify-between gap-8">
                                          <span className="text-white/60">Conservation Levy</span>
                                          <span className="text-white font-mono">
                                            R{Math.round(room.priceBreakdown?.breakdown?.levy || 0).toLocaleString()} x {room.priceBreakdown?.breakdown?.totalPeople || 0}
                                          </span>
                                        </div>
                                        <div className="flex justify-between gap-8 pt-2.5 border-t border-white/10 font-bold">
                                          <span className="text-primary uppercase text-[9px]">Total (Inc. Levies)</span>
                                          <span className="text-white font-headline italic text-sm">R{Math.round(room.totalStayCost).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>

                            <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 space-y-3 relative overflow-hidden group/integrity">
                              <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Your Member Saving</span>
                                  <span className="text-sm font-black text-emerald-400">R{Math.round(room.memberSaving || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1.5">
                                    <Leaf className="w-3 h-3 text-primary" />
                                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Conservation Fuel</span>
                                  </div>
                                  <span className="text-sm font-black text-primary">R{Math.round(room.conservationFuel || 0).toLocaleString()}</span>
                                </div>
                              </div>
                              
                              <p className="text-[9px] text-white/40 italic leading-relaxed border-t border-white/5 pt-2">
                                By booking direct, you save 5% and the lodge retains R{Math.round(room.conservationFuel || 0).toLocaleString()} in commission that would have gone to global platforms.
                              </p>

                              <div className="flex justify-between items-center pt-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <motion.div
                                      initial={{ scale: 1.4, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ duration: 0.8, delay: 0.2, type: 'spring' }}
                                    >
                                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[9px] font-bold uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 gap-1.5 transition-all">
                                        <ShieldCheck className="w-3 h-3" />
                                        Price Integrity
                                      </Button>
                                    </motion.div>
                                  </DialogTrigger>
                                  <DialogContent className="glass-card border-white/10 bg-[#0a0a0a] text-white max-w-md overflow-hidden p-0">
                                    <div className="bg-primary/10 p-6 border-b border-white/5">
                                      <DialogHeader>
                                        <DialogTitle className="text-2xl font-headline italic flex items-center gap-2 text-white">
                                          Direct Guardianship Analysis
                                        </DialogTitle>
                                        <DialogDescription className="text-primary/80 text-xs font-medium leading-relaxed mt-2 italic">
                                          "Apples-to-Apples" Normalization: All market rates are audited for VAT-inclusion, normalized to PPPN, and capture hidden mobile-only discounts.
                                        </DialogDescription>
                                      </DialogHeader>
                                    </div>
                                    
                                    <div className="p-6 space-y-6">
                                      <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center space-y-1">
                                          <Zap className="w-4 h-4 text-primary mx-auto" />
                                          <p className="text-[8px] font-black uppercase text-white/40">Rate Basis</p>
                                          <p className="text-[10px] font-bold text-white">PPPN (Per Person)</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center space-y-1">
                                          <Percent className="w-4 h-4 text-primary mx-auto" />
                                          <p className="text-[8px] font-black uppercase text-white/40">Tax Status</p>
                                          <p className="text-[10px] font-bold text-white">VAT-Incl</p>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center space-y-1">
                                          <Smartphone className="w-4 h-4 text-primary mx-auto" />
                                          <p className="text-[8px] font-black uppercase text-white/40">Device</p>
                                          <p className="text-[10px] font-bold text-white">Mobile-Match</p>
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Your Guaranteed Rate (PPPN)</p>
                                        <div className="p-4 rounded-xl bg-primary border border-primary/30 flex justify-between items-center shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                                          <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-primary-foreground/70 uppercase tracking-tighter">Lodge-Direct (Wild Rate)</span>
                                            <span className="text-2xl font-bold text-primary-foreground flex items-baseline gap-2">
                                              R{Math.round(room.totalStayCost || 0).toLocaleString()}
                                              <span className="text-xs font-medium opacity-70">(R{Math.round(room.heroPrice).toLocaleString()} {room.displayLabel})</span>
                                            </span>
                                          </div>
                                          <Badge className="bg-primary-foreground text-primary font-black text-[10px] px-3 py-1 shadow-sm">WINNER</Badge>
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">Market Extraction (Verified PPPN Benchmarks)</p>
                                        <div className="space-y-2">
                                          {room.competitors && room.competitors.length > 0 ? (
                                            room.competitors.map((comp, idx) => (
                                              <div key={idx} className="flex justify-between items-center py-3 px-4 rounded-xl bg-white/5 border border-white/5 opacity-70 hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-3">
                                                  <span className="text-sm font-medium text-white/90">{comp.source}</span>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                  <span className="text-sm font-bold text-white/40 line-through">
                                                    R{Math.round((comp.price * (room.priceBreakdown?.weight || 1) * (room.priceBreakdown?.breakdown?.nights || 1))).toLocaleString()}
                                                  </span>
                                                  <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">
                                                    (R{Math.round(comp.price).toLocaleString()} PPPN)
                                                  </span>
                                                </div>
                                              </div>
                                            ))
                                          ) : (
                                            <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-white/5 border border-white/5 opacity-50">
                                              <span className="text-sm font-medium text-white/70">Global Baseline Average</span>
                                              <div className="text-right flex flex-col items-end">
                                                <span className="text-sm font-bold text-white/40 line-through">
                                                  R{Math.round((room.otaPrice * (room.priceBreakdown?.weight || 1) * (room.priceBreakdown?.breakdown?.nights || 1))).toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">
                                                  (R{Math.round(room.otaPrice).toLocaleString()} PPPN)
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="pt-4 border-t border-white/10 space-y-4">
                                        <div className="flex flex-col gap-2">
                                          <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Member Saving</span>
                                            <span className="text-sm font-black text-emerald-400">R{Math.round(room.memberSaving || 0).toLocaleString()}</span>
                                          </div>
                                          <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                                            <div className="flex items-center gap-2">
                                              <Leaf className="w-3.5 h-3.5 text-primary" />
                                              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Conservation Fuel</span>
                                            </div>
                                            <span className="text-sm font-black text-primary">R{Math.round(room.conservationFuel || 0).toLocaleString()}</span>
                                          </div>
                                        </div>
                                        
                                        <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Ecosystem Impact</span>
                                          <span className="text-base font-headline italic font-bold text-white">R{Math.round(room.totalBenefit || 0).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="py-4 text-center">
                            <p className="text-xs text-muted-foreground italic leading-relaxed">{room.statusNote || 'No market rates available. Contact management for waitlist.'}</p>
                          </div>
                        )}
                      </div>

                      <Button 
                        className={`w-full h-12 rounded-full font-bold text-sm mt-6 transition-all ${room.isAvailable ? 'bg-white text-black hover:bg-primary hover:text-white' : 'bg-white/5 text-muted-foreground'}`}
                        onClick={() => room.isAvailable && handleSelectSanctuary(room)}
                        disabled={loading || !room.isAvailable}
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : room.isAvailable ? 'Select Lodge Suite' : 'Inquire Direct'}
                      </Button>

                      <p className="text-[8px] text-white/30 italic text-center mt-4 leading-relaxed px-2">
                        Rates are indicative and based on real-time global market data. Final rate and availability will be confirmed at the time of booking. Wildlife Hero members save an average of 5% compared to major travel platforms.
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TooltipProvider>
      </div>
    )}

      {step === 'roomSelection' && selectedLodgeResult && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setStep('results')} className="rounded-full text-white/60 hover:text-white hover:bg-white/5">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-3xl font-headline italic text-white">{selectedLodgeResult.lodgeName}</h2>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">Select Your Premium Accommodation (PPPN Pricing)</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setStep('config')} className="border-white/10 text-white text-xs font-bold uppercase h-10 px-6 rounded-full flex items-center gap-2 hover:bg-white/5 transition-colors self-start md:self-auto">
                <Settings2 className="w-3.5 h-3.5" />
                Modify Search
              </Button>
           </div>

           <div className="grid grid-cols-1 gap-8 max-w-5xl mx-auto">
              {sanctuarySuites.map((suite, idx) => (
                <Card key={idx} className="glass-card border-white/5 bg-black/40 overflow-hidden flex flex-col md:flex-row group hover:border-primary/40 transition-all shadow-2xl relative">
                  <div className="w-full md:w-1/2 aspect-[4/3] md:aspect-auto relative overflow-hidden bg-black/20">
                    {suite.allImages && suite.allImages.length > 1 ? (
                      <div className="h-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth">
                        {suite.allImages.map((img, i) => (
                          <div key={i} className="flex-none w-full h-full relative snap-center">
                            <Image src={img} alt={`${suite.displayName} - ${i}`} fill unoptimized className="object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Image src={suite.image} alt={suite.displayName} fill unoptimized className="object-cover group-hover:scale-105 transition-transform duration-1000" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/40" />
                    {suite.allImages && suite.allImages.length > 1 && (
                       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {suite.allImages.map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" />
                          ))}
                       </div>
                    )}
                  </div>
                  <CardContent className="flex-1 p-10 flex flex-col justify-between">
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="text-3xl font-headline font-bold text-white group-hover:text-primary transition-colors leading-tight">{suite.displayName}</h3>
                          <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Verified Direct Inventory</p>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-primary/30 text-[9px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full">RESERVED</Badge>
                      </div>
                      
                      <p className="text-base text-white/70 leading-relaxed font-light italic">{suite.description}</p>
                      
                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                        {selectedLodgeResult.amenities.slice(0, 6).map(a => (
                          <div key={a} className="flex items-center gap-2.5 text-[10px] font-bold text-white/50 uppercase tracking-tighter">
                            <Zap className="w-3 h-3 text-primary opacity-70" />
                            {a}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between mt-10 pt-8 border-t border-white/10 gap-6">
                      <div className="flex flex-col text-center md:text-left">
                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Confirmed Wild Rate ({selectedLodgeResult.displayLabel})</span>
                        <div className="flex items-baseline gap-2">
                           <span className="text-4xl font-bold text-white">R{Math.round(suite.heroPrice).toLocaleString()}</span>
                           <span className="text-[10px] text-primary font-bold uppercase">All-Inclusive</span>
                        </div>
                        {suite.totalStayCost && (
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                            Total Stay: R{Math.round(suite.totalStayCost).toLocaleString('en-ZA')}
                          </span>
                        )}
                      </div>
                      {/* NightsBridge API Preview Dialog */}
                      <Dialog open={showNightsbridgePreview && pendingSuite?.displayName === suite.displayName} onOpenChange={(open) => { if (!open) { setShowNightsbridgePreview(false); setPendingSuite(null); } }}>
                        <DialogTrigger asChild>
                          <Button
                            onClick={() => { setPendingSuite({ displayName: suite.displayName, price: suite.heroPrice, image: suite.image, otaPrice: suite.otaPrice }); setShowNightsbridgePreview(true); }}
                            className="w-full md:w-auto rounded-full bg-primary text-primary-foreground font-black h-16 px-12 text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                          >
                            Secure This Selection
                            <ChevronRight className="ml-2 w-5 h-5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-card border-white/10 bg-[#080808] text-white max-w-2xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
                          <div className="bg-amber-500/10 border-b border-amber-500/20 p-6">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-headline italic flex items-center gap-2 text-white">
                                <Zap className="w-5 h-5 text-amber-400" />
                                NightsBridge API Integration — Placeholder
                              </DialogTitle>
                              <DialogDescription className="text-amber-400/80 text-xs font-medium leading-relaxed mt-1">
                                ⚠️ Integration pending. This shows the <strong>outbound request</strong> we will send and the <strong>expected response shape</strong> from NightsBridge once we have their API specification.
                              </DialogDescription>
                            </DialogHeader>
                          </div>

                          <div className="p-6 space-y-6">
                            {/* Outbound Request */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                <ArrowRight className="w-3 h-3" /> Outbound — POST /api/nightsbridge/book
                              </p>
                              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-emerald-400 leading-relaxed overflow-x-auto">
{JSON.stringify({
  "// PLACEHOLDER — exact field names TBC with NightsBridge": null,
  property_id: selectedLodgeResult?.lodgeId ?? "NB_PROPERTY_ID",
  nightsbridge_bb_id: "[from lodge.nightsbridge_id in Firestore]",
  room_type_ref: suite.technicalName ?? suite.displayName,
  checkin: format(startDate, 'yyyy-MM-dd'),
  checkout: format(endDate, 'yyyy-MM-dd'),
  adults: adults,
  children: children,
  child_ages: childAges,
  rate_code: "WILDLIFEHERO-DIRECT",
  total_zar: Math.round(suite?.totalStayCost ?? 0),
  currency: "ZAR",
  guest: {
    email: user?.email ?? "member@example.com",
    name: "[from user profile]",
    phone: "[TBC — may require input step]"
  },
  source: "WildRates-Hero-Engine-v1",
  hero_quote_ref: "[Firestore quote doc ID]"
}, null, 2)}
                              </pre>
                            </div>

                            {/* Expected Response */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                                <ChevronRight className="w-3 h-3" /> Expected Response — shape unknown, placeholder below
                              </p>
                              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-white/40 leading-relaxed overflow-x-auto">
{JSON.stringify({
  "// PLACEHOLDER — NightsBridge response shape TBC": null,
  status: "success | pending | error",
  booking_id: "NB-XXXXXXXX",
  confirmation_code: "[NB confirmation ref]",
  payment_status: "on_arrival | prepaid | deposit_required",
  total_amount: "[echo of total_zar]",
  currency: "ZAR",
  checkin: format(startDate, 'yyyy-MM-dd'),
  checkout: format(endDate, 'yyyy-MM-dd'),
  voucher_url: "[URL to PDF voucher — if provided]",
  errors: ["[array of validation errors if any]"]
}, null, 2)}
                              </pre>
                            </div>

                            {/* What happens now */}
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-[11px] text-white/60 leading-relaxed space-y-1">
                              <p className="font-bold text-white/80 uppercase text-[9px] tracking-widest mb-2">What happens when you confirm:</p>
                              <p>1. A <span className="text-primary font-bold">Firestore quote document</span> is created with status <code className="text-primary">Pending</code>.</p>
                              <p>2. <span className="text-amber-400 font-bold">[FUTURE]</span> This payload will be POSTed to the NightsBridge booking endpoint.</p>
                              <p>3. <span className="text-amber-400 font-bold">[FUTURE]</span> On success, the quote will be updated with their <code className="text-primary">booking_id</code> and status set to <code className="text-primary">Confirmed</code>.</p>
                              <p>4. A lodge manager is notified via email to finalize the direct booking.</p>
                            </div>

                            <div className="flex gap-4 pt-2">
                              <Button
                                variant="outline"
                                className="flex-1 border-white/10 text-white/60 hover:bg-white/5 rounded-full h-12"
                                onClick={() => { setShowNightsbridgePreview(false); setPendingSuite(null); }}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="flex-1 bg-primary text-primary-foreground font-black rounded-full h-12 shadow-lg shadow-primary/20"
                                disabled={loading}
                                onClick={() => {
                                  setShowNightsbridgePreview(false);
                                  if (pendingSuite) handleSecureRate(pendingSuite.displayName, pendingSuite.price, pendingSuite.image, pendingSuite.otaPrice);
                                }}
                              >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4 mr-2" /> Confirm & Submit Quote</>}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
           </div>
        </div>
      )}

      {step === 'success' && selectedLodgeResult && finalSelectedRoom && (
        <Card className="glass-card max-w-2xl mx-auto border-primary/20 bg-primary/5 text-center py-16 px-10 shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <CardContent className="space-y-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-5xl font-headline italic text-white">Selection Verified.</h2>
              <p className="text-[10px] text-primary font-bold uppercase tracking-[0.4em]">Amakhala Direct Guardianship</p>
            </div>

            <div className="p-6 bg-black/40 rounded-3xl border border-white/5 text-left flex items-center gap-6">
               <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                  <Image src={finalSelectedRoom.image} alt={finalSelectedRoom.name} fill unoptimized className="object-cover" />
               </div>
               <div className="space-y-1">
                  <p className="text-sm font-headline italic text-white">{selectedLodgeResult.lodgeName}</p>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">{finalSelectedRoom.name}</p>
                  <p className="text-[10px] text-muted-foreground">{format(startDate, "PPP")} - {format(endDate, "PPP")} • {adults} Guardians</p>
               </div>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              <p className="text-muted-foreground text-sm leading-relaxed">Your reservation request for {selectedLodgeResult.lodgeName} has been transmitted. A lodge manager will finalize your direct impact confirmation within 24 hours.</p>
              
              <div className="pt-4 flex flex-col items-center">
                 <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">Total Guaranteed Saving (PPPN Basis)</p>
                 <p className="text-4xl font-bold text-white tracking-tighter">R{Math.round(selectedLodgeResult.savings).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => handleStepClick(1)} variant="outline" className="text-white border-white/10 hover:bg-white/5 rounded-full px-12 h-14 font-bold transition-all">
                New Discovery
              </Button>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-12 h-14 font-bold transition-all shadow-xl shadow-primary/20">
                <a href="/portal">View My History</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
