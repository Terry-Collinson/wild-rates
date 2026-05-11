
"use client"

import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { ShieldCheck, Scale, FileText, Gavel } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen pb-24 text-foreground bg-background">
      <Navbar />
      
      <div className="pt-32 pb-12 bg-black/20">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-4">
          <Gavel className="w-12 h-12 text-primary mx-auto" />
          <h1 className="text-4xl font-headline font-bold text-white">Terms of Service</h1>
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px]">The Guardian Framework & Community Standards</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-8">
        <Card className="glass-card border-white/5 bg-black/40 p-10 rounded-[2rem] space-y-10">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-xl font-headline font-bold">1. Eligibility & Status</h2>
            </div>
            <p className="text-white/70 leading-relaxed text-sm">
              Access to Wild Rates is a privilege reserved for verified members of the Amakhala community. By accessing this portal, you confirm that you are a "Guardian" in good standing. We reserve the right to verify community status through official channels, including the private Amakhala Guardians Facebook Group.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Scale className="w-5 h-5" />
              <h2 className="text-xl font-headline font-bold">2. The Guardian Pledge</h2>
            </div>
            <p className="text-white/70 leading-relaxed text-sm italic">
              "I commit to supporting the direct guardianship of Amakhala by bypassing third-party platforms, ensuring 100% of my impact goes directly to the soil, the scouts, and the species."
            </p>
            <p className="text-white/70 leading-relaxed text-sm">
              Breaking this pledge by sharing reserved rates publicly or using them for commercial arbitrage may result in the immediate revocation of your Wildlife Hero status and portal access.
            </p>
          </section>

          <section className="space-y-4 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 text-primary">
              <FileText className="w-5 h-5" />
              <h2 className="text-xl font-headline font-bold">3. Booking & Cancellations</h2>
            </div>
            <p className="text-white/70 leading-relaxed text-sm">
              Wild Rates provides direct access to sanctuary-managed inventory. All booking requests are subject to confirmation by the individual lodge management. Standard cancellation policies of each specific lodge apply to all reservations confirmed through this portal.
            </p>
          </section>

          <section className="space-y-4 pt-6 border-t border-white/5">
            <h2 className="text-xl font-headline font-bold text-white">4. Limitation of Liability</h2>
            <p className="text-white/70 leading-relaxed text-sm">
              While we strive for 100% accuracy in our Market Intelligence engine, Wild Rates is provided "as is." We are not responsible for pricing discrepancies on third-party platforms or service interruptions from external data providers.
            </p>
          </section>

          <div className="pt-10 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
