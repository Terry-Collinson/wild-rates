"use client"

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ShieldCheck, 
  ArrowRight, 
  Crown, 
  Loader2,
  CheckCircle2,
  Globe,
  Facebook,
  Shield,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth, useFirestore } from '@/firebase';
import { FacebookAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function HeroJoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  
  const referralSource = searchParams.get('utm_source') || 'direct';
  
  const [authState, setAuthState] = useState<'idle' | 'logging-in' | 'pledging' | 'verifying' | 'success'>('idle');
  const [userData, setUserData] = useState<{ name: string; photoURL: string; email: string; uid: string } | null>(null);

  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-safari')?.imageUrl || "/backgrounds/hillsneck.jpg";

  const handleFacebookLogin = async () => {
    if (!auth || !db) {
      toast({
        title: "System Initializing",
        description: "Firebase services are loading. Please try again in a moment.",
        variant: "destructive"
      });
      return;
    }
    
    setAuthState('logging-in');
    const provider = new FacebookAuthProvider();
    
    try {
      console.log("Initiating Facebook Login...");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      setUserData({
        name: user.displayName || 'Guardian',
        photoURL: user.photoURL || '',
        email: user.email || '',
        uid: user.uid
      });

      setAuthState('pledging');

    } catch (error: any) {
      console.error("FULL AUTH ERROR OBJECT:", error);
      setAuthState('idle');
      
      const errorCode = error.code || 'unknown';
      const errorMessage = error.message || 'An unexpected error occurred';

      // Specific check for domain errors which are common in this environment
      const isDomainError = errorMessage.includes('not iterable') || 
                            errorCode === 'auth/operation-not-allowed' ||
                            errorCode === 'auth/unauthorized-domain';

      toast({
        title: "Authentication Failed",
        description: isDomainError 
          ? "Domain Whitelist Error: Please ensure your workstation URL is added to 'Authorized Domains' in the Firebase Console."
          : `Error (${errorCode}): ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleCommitPledge = async () => {
    if (!userData || !db) return;
    
    setAuthState('verifying');

    try {
      const userDocRef = doc(db, 'users', userData.uid);
      await setDoc(userDocRef, {
        name: userData.name,
        email: userData.email,
        photoURL: userData.photoURL,
        isHero: true,
        heroTier: 3,
        referralSource: referralSource,
        joinedAt: serverTimestamp(),
        pledgeAccepted: true
      }, { merge: true });

      setTimeout(() => {
        setAuthState('success');
      }, 2500);

    } catch (error: any) {
      setAuthState('pledging');
      toast({
        title: "Database Error",
        description: "Could not finalize your Guardian profile.",
        variant: "destructive"
      });
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <Navbar />
      
      <section className="relative h-[45vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src={heroImg} 
            alt="Amakhala Reserve" 
            fill 
            priority
            className="object-cover opacity-20 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        </div>
        <div className="relative z-10 text-center space-y-4 px-4 pt-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold tracking-[0.2em] uppercase"
          >
            <ShieldCheck className="w-3 h-3" />
            Amakhala Guardian Onboarding
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-headline font-bold text-white italic"
          >
            From Member to <span className="text-primary italic">Guardian</span>
          </motion.h1>
          <p className="text-white/60 text-sm md:text-lg max-w-xl mx-auto font-light">
            Verify your standing in the Amakhala community via Facebook to unlock reserved Wild Rates.
          </p>
        </div>
      </section>

      <div className="bg-primary/5 border-y border-white/5 py-4 relative z-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/40">
          <span className="flex items-center gap-2 text-white/60"><Globe className="w-4 h-4 text-primary" /> 100% Direct Funding</span>
          <span className="flex items-center gap-2 text-white/60"><ShieldCheck className="w-4 h-4 text-primary" /> Verified Hero Status</span>
          <span className="flex items-center gap-2 text-white/60"><Crown className="w-4 h-4 text-primary" /> Member-Only Wild Rates</span>
        </div>
      </div>

      <section className="max-w-xl mx-auto px-4 py-20 relative min-h-[500px]">
        <AnimatePresence mode="wait">
          {(authState === 'idle' || authState === 'logging-in') && (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <Card className="glass-card border-white/10 bg-black/40 p-10 rounded-[2.5rem] text-center space-y-8 shadow-2xl">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                    <Facebook className="w-10 h-10 text-[#1877F2]" />
                  </div>
                  <h2 className="text-2xl font-headline font-bold italic text-white">One Click to Claim Status</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">We use your Facebook profile to verify your community membership and personalize your Hero ID.</p>
                </div>

                <div className="space-y-4">
                  <Button 
                    onClick={handleFacebookLogin}
                    disabled={authState === 'logging-in'}
                    className="w-full h-16 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold rounded-full text-lg shadow-xl shadow-[#1877F2]/20 flex items-center justify-center gap-3 transition-all"
                  >
                    {authState === 'logging-in' ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Facebook className="w-6 h-6 fill-white" />
                        Continue with Facebook
                      </>
                    )}
                  </Button>
                  <div className="flex flex-col gap-2">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-left">
                      <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-200/60 leading-relaxed italic">
                        <strong>Developer Note:</strong> If you see "t is not iterable", ensure your current workstation URL is added to the <strong>Authorized Domains</strong> list in the Firebase Console.
                      </p>
                    </div>
                    <div className="flex justify-center gap-4 text-[9px] uppercase tracking-widest text-white/20 font-bold mt-2">
                      <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                      <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                      <Link href="/deletion" className="hover:text-primary transition-colors">Data Deletion</Link>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="opacity-20 grayscale pointer-events-none blur-[1px]">
                <p className="text-[10px] text-center uppercase tracking-[0.3em] font-bold text-primary mb-6">Your Hero ID Preview</p>
                <div className="relative max-w-sm mx-auto aspect-[1.6/1] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-[2rem] border border-white/10 p-8 text-left shadow-2xl overflow-hidden">
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10" />
                        <div>
                          <p className="text-[8px] text-primary font-bold uppercase tracking-widest">Pending Verification</p>
                          <div className="h-4 w-24 bg-white/10 rounded mt-1" />
                        </div>
                      </div>
                      <Crown className="w-6 h-6 text-white/10" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {authState === 'pledging' && (
            <motion.div 
              key="pledge"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-8"
            >
              <Card className="glass-card border-primary/30 bg-primary/5 p-10 rounded-[2.5rem] text-center space-y-8 shadow-2xl">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-headline font-bold italic text-white">The Guardian Pledge</h2>
                  <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px]">Your commitment to the wild</p>
                </div>
                
                <div className="bg-black/40 p-8 rounded-3xl border border-white/5 text-left italic font-serif text-lg leading-relaxed text-white/80">
                  "I commit to supporting the direct guardianship of Amakhala by bypassing third-party platforms, ensuring 100% of my impact goes directly to the soil, the scouts, and the species."
                </div>

                <Button 
                  onClick={handleCommitPledge}
                  className="w-full h-16 bg-primary text-primary-foreground font-black rounded-full text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
                >
                  I Accept the Pledge
                  <Check className="ml-2 w-5 h-5" />
                </Button>
              </Card>
            </motion.div>
          )}

          {authState === 'verifying' && (
            <motion.div 
              key="verifying"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center py-20 space-y-8"
            >
              <div className="relative w-32 h-32 mx-auto">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-primary/10 rounded-full border-t-primary"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="w-12 h-12 text-primary" />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-headline italic font-bold text-white">Verifying Guardian Status...</h2>
                <p className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] opacity-80">Cross-referencing Amakhala Database</p>
              </div>
            </motion.div>
          )}

          {authState === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-12 text-center"
            >
              <div className="space-y-4">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-4xl font-headline font-bold italic text-white">Identity Confirmed</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">Welcome to the inner circle of direct guardianship, {userData?.name.split(' ')[0]}.</p>
              </div>

              <div className="relative max-w-sm mx-auto aspect-[1.6/1] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-[2rem] border border-primary/30 p-8 text-left shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Crown className="w-48 h-48 text-primary group-hover:scale-110 transition-transform duration-1000" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {userData?.photoURL ? (
                        <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-primary/30 shadow-lg">
                          <Image src={userData.photoURL} alt={userData.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                          <Crown className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-[0.3em] mb-1">Wildlife Hero</p>
                        <h3 className="text-2xl font-headline font-bold text-white italic leading-tight">{userData?.name}</h3>
                      </div>
                    </div>
                    <div className="bg-primary/20 p-2 rounded-lg border border-primary/30">
                      <Crown className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[8px] text-white/40 uppercase tracking-widest mb-0.5">Hero Tier</p>
                        <p className="text-xs font-bold text-white tracking-wide">LEVEL 03 - GUARDIAN</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-white/40 uppercase tracking-widest mb-0.5">Verified At</p>
                        <p className="text-xs font-bold text-white tracking-wide">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="h-0.5 w-full bg-primary/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button 
                  asChild
                  className="w-full h-16 bg-primary text-primary-foreground font-black rounded-full text-lg shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                >
                  <Link href="/portal">
                    Access Wild Rates Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <div className="flex justify-center gap-6 text-[10px] uppercase tracking-widest text-white/20 font-bold">
                  <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
