
"use client"

import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { ShieldCheck, Lock, Eye, FileText, Database, Share2 } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen pb-24 text-foreground bg-background">
      <Navbar />
      
      <div className="pt-32 pb-12 bg-black/20">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-4">
          <FileText className="w-12 h-12 text-primary mx-auto" />
          <h1 className="text-4xl font-headline font-bold text-white">Privacy Policy</h1>
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px]">Your Data. Our Sanctuary. Protected.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-8">
        <Card className="glass-card border-white/5 bg-black/40 p-8 rounded-[2rem] space-y-10">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Eye className="w-5 h-5" />
              <h2 className="text-xl font-headline font-bold">What We Collect</h2>
            </div>
            <p className="text-white/70 leading-relaxed text-sm">
              Wild Rates collects specific data to verify your status as a member of the Amakhala community. When you sign in via Facebook, we receive:
            </p>
            <ul className="list-disc pl-5 text-white/60 text-sm space-y-2 italic">
              <li><strong>Full Identity:</strong> Your display name as it appears on Facebook.</li>
              <li><strong>Contact:</strong> Your primary verified email address for booking confirmations.</li>
              <li><strong>Imagery:</strong> Your Facebook profile picture to generate your digital Wildlife Hero ID.</li>
              <li><strong>Social ID:</strong> A unique numerical identifier (UID) to secure your sanctuary profile.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Share2 className="w-5 h-5" />
              <h2 className="text-xl font-headline font-bold">Attribution Tracking</h2>
            </div>
            <p className="text-white/70 leading-relaxed text-sm">
              To measure the growth of our community, we track which group or link referred you (e.g., via utm_source). This is used strictly for internal analytics to optimize our conservation outreach.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Database className="w-5 h-5" />
              <h2 className="text-xl font-headline font-bold">Storage & Security</h2>
            </div>
            <p className="text-white/70 leading-relaxed text-sm">
              Your profile data is encrypted and stored within <strong>Firebase (Google Cloud)</strong>. We utilize secured Cloud Firestore instances with strict access controls. Only authorized sanctuary administrators can view your identity for the purpose of confirming your direct member rates.
            </p>
          </section>

          <section className="space-y-4 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 text-primary">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-xl font-headline font-bold">Use of Information</h2>
            </div>
            <p className="text-white/70 leading-relaxed text-sm">
              We never sell, rent, or trade your data. Your information is used exclusively to:
            </p>
            <ul className="list-disc pl-5 text-white/60 text-sm space-y-1 italic">
              <li>Validate your eligibility for reserved Amakhala rates.</li>
              <li>Personalize your member experience within the portal.</li>
              <li>Process and confirm your direct booking requests.</li>
            </ul>
          </section>

          <div className="pt-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
              For complete transparency or to remove your identity from our systems, please visit our <a href="/deletion" className="text-primary underline">Data Deletion</a> page.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
