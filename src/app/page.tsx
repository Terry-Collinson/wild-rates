"use client"

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight, ShieldCheck, Tag, Globe, Loader2, UserCircle } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function LandingPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [guestLoading, setGuestLoading] = useState(false);
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-safari')?.imageUrl || '/backgrounds/hillsneck.jpg';

  const handleGuestEntry = async () => {
    if (!auth) return;
    setGuestLoading(true);
    try {
      await signInWithEmailAndPassword(auth, "guest@wildrates.com", "guestaccess2024");
      window.location.href = '/portal';
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, "guest@wildrates.com", "guestaccess2024");
          window.location.href = '/portal';
        } catch (createError: any) {
          toast({ title: "Guest Access Error", variant: "destructive" });
        }
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <Image 
            src={heroImg} 
            alt="Amakhala Reserve Sunset" 
            fill 
            priority
            className="object-cover opacity-100 scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-transparent to-background/20" />
        </div>

        <div className="relative z-10 max-w-4xl px-4 text-center space-y-8 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-bold backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4" />
            Member-Only Access
          </div>
          <h1 className="text-5xl md:text-7xl font-headline font-bold leading-tight text-white drop-shadow-2xl">
            Exclusive Access. <br /><span className="text-primary italic">Unrivaled Impact.</span>
          </h1>
          <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto font-medium leading-relaxed drop-shadow-lg">
            Discover rates reserved for our inner circle. By booking directly through Wild Rates, 
            you bypass external fees, ensuring your stay provides maximum support for 
            Amakhala’s conservation efforts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/portal">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 h-14 group rounded-full font-bold shadow-xl">
                Enter Rate Calculator
                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={handleGuestEntry}
              disabled={guestLoading}
              className="border-white/40 bg-white/10 backdrop-blur-md hover:bg-white/20 text-lg px-8 h-14 rounded-full text-white font-bold"
            >
              {guestLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserCircle className="w-4 h-4 mr-2" />}
              Continue as Guest
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-4 p-8 glass-card rounded-2xl border-white/5 bg-black/40">
          <Tag className="text-primary w-10 h-10" />
          <h3 className="text-2xl font-headline font-bold text-white">Guaranteed Discount</h3>
          <p className="text-muted-foreground">Get a baseline 5% off the best price you find on Google Hotels, every single time.</p>
        </div>
        <div className="space-y-4 p-8 glass-card rounded-2xl border-white/5 bg-black/40">
          <ShieldCheck className="text-primary w-10 h-10" />
          <h3 className="text-2xl font-headline font-bold text-white">Conservation Direct</h3>
          <p className="text-muted-foreground">Removing middlemen means more money goes directly to protecting wildlife at Amakhala.</p>
        </div>
        <div className="space-y-4 p-8 glass-card rounded-2xl border-white/5 bg-black/40">
          <Globe className="text-primary w-10 h-10" />
          <h3 className="text-2xl font-headline font-bold text-white">Expert Support</h3>
          <p className="text-muted-foreground">Direct connection to the reserve's management for seamless confirmations.</p>
        </div>
      </section>
    </main>
  );
}