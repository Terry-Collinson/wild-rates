
"use client"

import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Trash2, ShieldAlert, Mail, UserX, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen pb-24 text-foreground bg-background">
      <Navbar />
      
      <div className="pt-32 pb-12 bg-black/20">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-4">
          <UserX className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-4xl font-headline font-bold text-white">Data Deletion Request</h1>
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px]">Member Empowerment & Right to be Forgotten</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-8">
        <Card className="glass-card border-white/5 bg-black/40 p-10 rounded-[2rem] space-y-8 text-center">
          <div className="space-y-4 max-w-xl mx-auto">
            <ShieldAlert className="w-8 h-8 text-primary mx-auto opacity-50" />
            <h2 className="text-2xl font-headline font-bold text-white">How to Remove Your Guardian Profile</h2>
            <p className="text-white/70 leading-relaxed text-sm">
              In accordance with Facebook Platform Rules and international data standards (GDPR/POPIA), you can request the complete removal of your identity and historical data from our systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
              <Database className="w-6 h-6 text-primary mx-auto" />
              <h3 className="font-bold text-white">Data Removed</h3>
              <p className="text-xs text-white/50 italic">Full erasure of:</p>
              <ul className="text-[10px] text-white/60 space-y-1 list-none">
                <li>Facebook Name & Email</li>
                <li>Guardian Profile & Tier</li>
                <li>All Booking History</li>
              </ul>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
              <Mail className="w-6 h-6 text-primary mx-auto" />
              <h3 className="font-bold text-white">Initiate Request</h3>
              <p className="text-xs text-white/50 italic">Fastest resolution (24-48 hours)</p>
              <p className="text-sm text-white/80">Email us from your FB email:</p>
              <p className="font-bold text-primary">reservations@amakhala.com</p>
            </div>
          </div>

          <div className="pt-10 space-y-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
              <strong>Note:</strong> This action is permanent. Upon deletion, you will lose your "Guardian" status and access to Wild Rates.
            </p>
            <Button variant="outline" className="border-white/10 text-white/40 h-12 rounded-full px-8 hover:text-white" asChild>
              <a href="mailto:reservations@amakhala.com?subject=Guardian Data Removal Request">Request Complete Deletion</a>
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
