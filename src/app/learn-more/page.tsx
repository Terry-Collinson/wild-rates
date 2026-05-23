"use client"

import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, Zap, HeartHandshake, Leaf, Users, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function LearnMorePage() {
  const headerImg = PlaceHolderImages.find(img => img.id === 'hero-safari')?.imageUrl;

  return (
    <main className="min-h-screen pb-24 text-foreground bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {headerImg && (
            <Image 
              src={headerImg} 
              alt="Amakhala Landscape" 
              fill
              priority
              className="object-cover opacity-90 scale-105"
            />
          )}
          {/* FURTHER LIGHTENED: Reduced overlay opacity */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl px-4 text-center space-y-6 pt-32 pb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
            The Privilege of Direct Guardianship
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight text-white">
            Your Stay. <br /><span className="text-primary italic font-serif">Our Reserve.</span>
          </h1>
          <p className="text-lg md:text-2xl text-white max-w-3xl mx-auto font-light leading-relaxed drop-shadow-lg">
            At Amakhala, the line between guest and guardian is thin. You are more than a visitor; you are a vital partner in the restoration of the Amakhala heritage.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-6xl mx-auto px-4 relative z-20 -mt-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-4 flex flex-col bg-black/40 backdrop-blur-xl hover:border-primary/30 transition-colors shadow-2xl">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Zap className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Unrivaled Impact</h3>
            <p className="text-muted-foreground leading-relaxed text-sm flex-grow">
              By removing third-party layers, we ensure that the value of your journey goes straight into the soil, the scouts, and the species that call this reserve home.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-4 flex flex-col bg-black/40 backdrop-blur-xl hover:border-primary/30 transition-colors shadow-2xl">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <HeartHandshake className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">The Inner Circle</h3>
            <p className="text-muted-foreground leading-relaxed text-sm flex-grow">
              Wild Rates is our commitment to transparency. We match elite platform rates while reclaiming the commissions usually lost to global middlemen, directing them back to the wild.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-4 flex flex-col bg-black/40 backdrop-blur-xl hover:border-primary/30 transition-colors shadow-2xl">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <ShieldCheck className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Frontline Protection</h3>
            <p className="text-muted-foreground leading-relaxed text-sm flex-grow">
              Every night fuels our Anti-Poaching Units—financing the specialized technology, K9 units, and 24/7 presence required to keep our wildlife populations secure.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-4 flex flex-col bg-black/40 backdrop-blur-xl hover:border-primary/30 transition-colors shadow-2xl">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Leaf className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Legacy Ecology</h3>
            <p className="text-muted-foreground leading-relaxed text-sm flex-grow">
              Your stay powers science-led habitat restoration and indigenous flora management, ensuring a thriving, balanced ecosystem for generations to come.
            </p>
          </div>

          <div className="glass-card p-8 rounded-3xl border border-white/5 space-y-4 flex flex-col bg-black/40 backdrop-blur-xl lg:col-span-2 hover:border-primary/30 transition-colors shadow-2xl">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Users className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">The Next Generation</h3>
            <p className="text-muted-foreground leading-relaxed text-sm flex-grow">
              We remove hidden family surcharges common on dynamic engines. Our reserved rates are designed to invite the next generation of biodiversity guardians to experience the wild.
            </p>
          </div>

        </div>

        {/* The Final Word */}
        <div className="mt-12 glass-card p-10 md:p-20 rounded-[2.5rem] border border-primary/20 bg-primary/5 text-center space-y-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck className="w-96 h-96 text-primary" />
          </div>
          <h3 className="text-sm font-bold tracking-[0.3em] uppercase text-primary relative z-10">Beyond Tourism</h3>
          <p className="text-2xl md:text-4xl text-white leading-tight max-w-4xl mx-auto font-serif italic relative z-10">
            &quot;Experience the wild as it was meant to be—purposeful, pure, and protected by your presence.&quot;
          </p>
          <div className="pt-8 relative z-10">
            <Link href="/portal">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-12 h-16 text-lg font-bold rounded-full group">
                Access Member Rates
                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}