"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import AdminNavbar from '@/components/admin/AdminNavbar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

import { useUser, useAuth } from '@/firebase';
import { useProfile } from '@/firebase/auth/use-profile';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const ADMIN_EMAILS = ['reservations@amakhala.com', 'terry_collinson@debono.net'];

interface AdminContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mode: 'operations' | 'systems';
  setMode: (mode: 'operations' | 'systems') => void;
  activeLodgeFilter: string;
  setActiveLodgeFilter: (filter: string) => void;
  mediaSyncing: boolean;
  setMediaSyncing: (syncing: boolean) => void;
  isSuperAdmin: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: loadingUser } = useUser();
  const { profile, loading: loadingProfile } = useProfile();
  const router = useRouter();
  const auth = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [mode, setMode] = useState<'operations' | 'systems'>('operations');
  const [activeLodgeFilter, setActiveLodgeFilter] = useState('all');
  const [mediaSyncing, setMediaSyncing] = useState(false);
  const { toast } = useToast();

  const runMediaSync = async () => {
    setMediaSyncing(true);
    try {
      const response = await fetch('/api/admin/sync-images', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Media Sync Success",
          description: `Processed: ${data.stats?.total || 0} rooms. Synced: ${data.stats?.success || 0}, Failed: ${data.stats?.failed || 0}.`
        });
      } else {
        throw new Error(data.error || "Failed to download media CDN assets");
      }
    } catch (error: any) {
      toast({
        title: "Media Sync Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setMediaSyncing(false);
    }
  };

  const isSuperAdmin = !!(profile?.role === 'super_admin' || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())));
  const managed_lodge_ids = profile?.managed_lodge_ids || [];
  const hasAccess = isSuperAdmin || managed_lodge_ids.length > 0;

  useEffect(() => {
    if (!loadingUser && !loadingProfile && !user) {
      router.push('/hero-join');
    }
  }, [loadingUser, loadingProfile, user, router]);

  if (loadingUser || loadingProfile || !user) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-headline italic font-bold text-white mb-2">Restricted Access</h1>
        <p className="text-white/40 max-w-md mb-8">
          Your account is not currently assigned to any lodges. Please contact the system administrator to provision your access scope.
        </p>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => router.push('/portal')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Portal
          </Button>
          <Button
            variant="ghost"
            className="text-white/40 hover:text-white hover:bg-white/5"
            onClick={async () => {
              if (auth) {
                await signOut(auth);
                router.push('/hero-join');
              }
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const headerTitle = isSuperAdmin
    ? (mode === 'operations' ? 'Administrator Dashboard' : 'Infrastructure Control')
    : (profile?.managed_lodge_ids?.[0] ? `${profile.managed_lodge_ids[0].charAt(0).toUpperCase() + profile.managed_lodge_ids[0].slice(1)} Dashboard` : 'Lodge Dashboard');

  const contextValue: AdminContextType = {
    activeTab,
    setActiveTab,
    mode,
    setMode,
    activeLodgeFilter,
    setActiveLodgeFilter,
    mediaSyncing,
    setMediaSyncing,
    isSuperAdmin
  };

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="flex flex-col min-h-screen w-full bg-[#080808] text-white">

        {/* Main Navbar Element */}
        <AdminNavbar
          lodgeName={headerTitle}
        />

        {/* ⚡ Split Grid Workspace: Places Sidebar cleanly next to core content panels */}
        <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row flex-1 px-4 md:px-10 pt-6 pb-20 gap-8">

          {/* Left Hand Sidebar Column Container */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <SidebarProvider>
              <AdminSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                mode={mode}
                setMode={setMode}
                activeLodgeFilter={activeLodgeFilter}
                setActiveLodgeFilter={setActiveLodgeFilter}
                runMediaSync={runMediaSync}
                mediaSyncing={mediaSyncing}
                isSuperAdmin={isSuperAdmin}
              />
            </SidebarProvider>
          </aside>

          {/* Main Context Right Hand Window Canvas */}
          <main className="flex-grow min-w-0">
            {children}
          </main>

        </div>
      </div>
    </AdminContext.Provider>
  );
}