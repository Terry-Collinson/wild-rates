
"use client"

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Home, User, LogIn, ChevronDown, Facebook } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { usePathname } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_EMAILS = ['reservations@amakhala.com', 'terry_collinson@debono.net'];
const FB_GROUP_URL = `https://www.facebook.com/groups/135339659870615`;

export default function Navbar() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const pathname = usePathname();
  
  const logoUrl = PlaceHolderImages.find(img => img.id === 'app-logo-icon')?.imageUrl || '/icons/icon-192x192.png';
  const isPortal = pathname?.startsWith('/portal') || pathname?.startsWith('/admin');
  const isAdmin = user?.email && ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    window.location.href = '/';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl auto px-4 h-20 flex items-center justify-between">
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
                <span className="text-xl font-headline font-bold text-white tracking-tight leading-none">Member Sanctuary</span>
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
                      <span>Member Sanctuary</span>
                    </Link>
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
    </nav>
  );
}
