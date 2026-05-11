"use client"

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Facebook,
  UserCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const logoUrl = PlaceHolderImages.find(img => img.id === 'app-logo-main')?.imageUrl || '/icons/icon-192x192.png';
  const heroImg = '/backgrounds/hillsneck.jpg';

  const handleFacebookLogin = async () => {
    if (!auth) return;
    setFbLoading(true);
    const provider = new FacebookAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      window.location.href = '/portal';
    } catch (error: any) {
      toast({ title: "Facebook Auth Error", description: error.message, variant: "destructive" });
    } finally { setFbLoading(false); }
  };

  const handleGuestLogin = async () => {
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
          toast({ title: "Guest Error", description: "Could not initialize guest session.", variant: "destructive" });
        }
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } finally { setGuestLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/portal';
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Invalid credentials.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col bg-slate-950 overflow-hidden font-body">
      {/* 1. BACKGROUND LAYER - Now properly constrained by 'relative' parent */}
      <div className="absolute inset-0 z-0">
        <Image
          src={heroImg}
          alt="Amakhala Reserve"
          fill
          className="object-cover opacity-50"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950/90" />
      </div>

      <div className="relative z-20">
        <Navbar />
      </div>

      {/* 2. LOGIN CARD CONTAINER - Z-index 10 ensures it stays above the image */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <Card className="glass-card w-full max-w-md shadow-2xl border-white/10 text-white rounded-[var(--radius)]">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-white/10 p-1 rounded-2xl flex items-center justify-center w-20 h-20 border border-white/20 overflow-hidden">
                <Image src={logoUrl} alt="Logo" width={80} height={80} className="object-cover" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold tracking-tight gold-shimmer">WILD RATES</CardTitle>
            <CardDescription className="text-gray-400">
              Access reserved landowner rates
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={handleFacebookLogin}
                disabled={fbLoading || guestLoading}
                className="w-full h-12 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all"
              >
                {fbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-5 h-5 fill-white" />}
                Continue with Facebook
              </Button>

              <Button
                onClick={handleGuestLogin}
                disabled={fbLoading || guestLoading}
                variant="outline"
                className="w-full h-12 border-white/10 bg-white/5 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all"
              >
                {guestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCircle className="w-5 h-5" />}
                Explore as Guest
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-gray-500">
                <span className="bg-[#0a0e0a] px-2 italic">OR ADMIN LOGIN</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@wildrates.com"
                    className="pl-10 bg-white/5 border-white/10 h-12 text-white placeholder:text-gray-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-10 pr-10 bg-white/5 border-white/10 h-12 text-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 font-bold rounded-xl transition-all shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Login to Dashboard"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-8">
            <p className="text-[10px] text-gray-500 text-center px-6 leading-relaxed">
              *Landowner rates are strictly for members.
            </p>
            <div className="flex justify-center gap-6 text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}