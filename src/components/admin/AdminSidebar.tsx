"use client"

import * as React from "react"
import {
  LayoutDashboard,
  MapPin,
  Zap,
  Library,
  ClipboardList,
  Database,
  ImageIcon,
  ChevronRight,
  Shield,
  Loader2,
  Facebook,
  ExternalLink,
  Users,
  Building2,
  Sliders,
  TrendingUp,
  ShieldAlert,
  Activity
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { INITIAL_LODGES } from "@/lib/mock-data"
import { useProfile } from "@/firebase/auth/use-profile"
import { cn } from "@/lib/utils"
import { useFirestore } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"
import { collection } from "firebase/firestore"
import { Lodge } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mode: 'operations' | 'systems';
  setMode: (mode: 'operations' | 'systems') => void;
  activeLodgeFilter: string;
  setActiveLodgeFilter: (filter: string) => void;
  runMediaSync: () => void;
  mediaSyncing: boolean;
  isSuperAdmin?: boolean;
}

export function AdminSidebar({
  activeTab,
  setActiveTab,
  mode,
  setMode,
  activeLodgeFilter,
  setActiveLodgeFilter,
  runMediaSync,
  mediaSyncing,
  isSuperAdmin = false
}: AdminSidebarProps) {
  const { profile, loading } = useProfile();
  const { toast } = useToast();
  const [deploying, setDeploying] = React.useState(false);

  const handleDeployToLive = async () => {
    setDeploying(true);
    toast({
      title: "Initiating Git Sync & Live Deploy",
      description: "Saving workspace changes, pushing to GitHub, and uploading to Firebase...",
    });

    try {
      const response = await fetch('/api/admin/deploy', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        toast({
          title: data.message || "Successfully Deployed!",
          description: data.gitStatus || "Local source uploaded successfully. Rollout is running in background.",
          variant: "default"
        });
      } else {
        toast({
          title: "Deployment Failed",
          description: data.details || data.error || "An unknown error occurred during deployment.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Deployment Error",
        description: error.message || "Network error while calling local deploy api.",
        variant: "destructive"
      });
    } finally {
      setDeploying(false);
    }
  };
  const db = useFirestore();
  const lodgesQuery = React.useMemo(() => db ? collection(db, 'lodges') : null, [db]);
  const { data: dbLodges } = useCollection<Lodge>(lodgesQuery);

  const lodgesList = dbLodges && dbLodges.length > 0 ? dbLodges : INITIAL_LODGES;

  const actualSuperAdmin = isSuperAdmin || profile?.role === 'super_admin';
  const managed_lodge_ids = profile?.managed_lodge_ids || [];

  const filteredLodges = (actualSuperAdmin === true)
    ? lodgesList
    : lodgesList.filter(lodge => managed_lodge_ids.includes(lodge.id));

  const showAllOption = actualSuperAdmin || filteredLodges.length > 1;

  if (loading) {
    return (
      <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#0c0c0c] shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#0c0c0c] shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-20">
      <SidebarHeader className="border-b border-white/10 p-6 bg-[#0c0c0c]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center border border-primary/20">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">WildRates PRO</span>
            <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.3em]">
              {actualSuperAdmin ? 'System Terminal' : 'Lodge Terminal'}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 space-y-6 bg-[#0c0c0c]">

        {/* Hub 0: Activity (Google Analytics) */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] font-mono uppercase font-bold text-white/20 tracking-[0.2em] mb-3 px-2">
            Activity
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-10 text-white/50 hover:text-white px-3 w-full justify-start gap-3">
                <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">
                  <Activity className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-xs uppercase tracking-wider font-bold">Google Analytics</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-30 flex-shrink-0" />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Hub 1: Core Administration Control */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] font-mono uppercase font-bold text-white/20 tracking-[0.2em] mb-3 px-2">
            Administration
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mode === 'operations' && activeTab === 'overview'}
                onClick={() => { setMode('operations'); setActiveTab('overview'); }}
                className={cn(
                  "h-10 rounded-md transition-all px-3 w-full justify-start gap-3",
                  mode === 'operations' && activeTab === 'overview' ? "bg-white/5 text-primary border border-white/5 font-bold" : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs uppercase tracking-wider">Dashboard Overview</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mode === 'operations' && activeTab === 'lodge-details'}
                onClick={() => { setMode('operations'); setActiveTab('lodge-details'); }}
                className={cn(
                  "h-10 rounded-md transition-all px-3 w-full justify-start gap-3",
                  mode === 'operations' && activeTab === 'lodge-details' ? "bg-white/5 text-primary border border-white/5 font-bold" : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs uppercase tracking-wider">Lodge Details</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mode === 'operations' && activeTab === 'inventory'}
                onClick={() => { setMode('operations'); setActiveTab('inventory'); }}
                className={cn(
                  "h-10 rounded-md transition-all px-3 w-full justify-start gap-3",
                  mode === 'operations' && activeTab === 'inventory' ? "bg-white/5 text-primary border border-white/5 font-bold" : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <Sliders className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs uppercase tracking-wider">Inventory Config</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <Collapsible asChild defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="h-10 text-white/50 hover:text-white px-3 justify-start gap-3 w-full">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs uppercase tracking-wider font-bold">Active Scopes</span>
                    <ChevronRight className="ml-auto w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="border-l border-white/5 ml-4 mt-1 gap-1 pl-2">
                    {showAllOption && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={mode === 'operations' && activeTab === 'sanctuaries' && activeLodgeFilter === 'all'}
                          onClick={() => { setMode('operations'); setActiveTab('sanctuaries'); setActiveLodgeFilter('all'); }}
                          className={cn(
                            "text-[11px] uppercase tracking-wide py-2 block text-left w-full",
                            mode === 'operations' && activeTab === 'sanctuaries' && activeLodgeFilter === 'all' ? "text-primary font-bold" : "text-white/40 hover:text-white"
                          )}
                        >
                          All Managed Scopes
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}
                    {filteredLodges.map((lodge) => (
                      <SidebarMenuSubItem key={lodge.id}>
                        <SidebarMenuSubButton
                          isActive={mode === 'operations' && activeTab === 'sanctuaries' && activeLodgeFilter === lodge.id}
                          onClick={() => { setMode('operations'); setActiveTab('sanctuaries'); setActiveLodgeFilter(lodge.id); }}
                          className={cn(
                            "text-[11px] uppercase tracking-wide py-2 block text-left w-full",
                            mode === 'operations' && activeTab === 'sanctuaries' && activeLodgeFilter === lodge.id ? "text-primary font-bold" : "text-white/40 hover:text-white"
                          )}
                        >
                          {lodge.name}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mode === 'operations' && activeTab === 'bookings'}
                onClick={() => { setMode('operations'); setActiveTab('bookings'); }}
                className={cn(
                  "h-10 rounded-md transition-all px-3 w-full justify-start gap-3",
                  mode === 'operations' && activeTab === 'bookings' ? "bg-white/5 text-primary border border-white/5 font-bold" : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <ClipboardList className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs uppercase tracking-wider">Transmission Log</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Hub 2: Market Intelligence Layer */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] font-mono uppercase font-bold text-emerald-500/40 tracking-[0.2em] mb-3 px-2">
            Intelligence
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mode === 'operations' && activeTab === 'competitors'}
                onClick={() => { setMode('operations'); setActiveTab('competitors'); }}
                className={cn(
                  "h-10 rounded-md transition-all px-3 w-full justify-start gap-3",
                  mode === 'operations' && activeTab === 'competitors'
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs uppercase tracking-wider">Competitors</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mode === 'operations' && activeTab === 'velocity'}
                onClick={() => { setMode('operations'); setActiveTab('velocity'); }}
                className={cn(
                  "h-10 rounded-md transition-all px-3 w-full justify-start gap-3",
                  mode === 'operations' && activeTab === 'velocity'
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <TrendingUp className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs uppercase tracking-wider">Market Velocity</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Hub 3: Ecosystem Control */}
        {actualSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[9px] font-mono uppercase font-bold text-primary/40 tracking-[0.2em] mb-3 px-2">
              System Controls
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={mode === 'systems' && activeTab === 'core'}
                  onClick={() => { setMode('systems'); setActiveTab('core'); }}
                  className={cn(
                    "h-10 rounded-md transition-all px-3 w-full justify-start gap-3",
                    mode === 'systems' && activeTab === 'core' ? "bg-white/5 text-primary border border-white/5 font-bold" : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Database className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs uppercase tracking-wider">Global Registry</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={mode === 'systems' && activeTab === 'users'}
                  onClick={() => { setMode('systems'); setActiveTab('users'); }}
                  className={cn(
                    "h-10 rounded-md transition-all px-3 w-full justify-start gap-3",
                    mode === 'systems' && activeTab === 'users' ? "bg-white/5 text-primary border border-white/5 font-bold" : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs uppercase tracking-wider">User Clearances</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleDeployToLive}
                  disabled={deploying}
                  className="h-10 rounded-md transition-all px-3 w-full justify-start gap-3 text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-50"
                >
                  {deploying ? (
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-primary" />
                  ) : (
                    <Zap className="w-4 h-4 flex-shrink-0 text-primary fill-primary" />
                  )}
                  <span className="text-xs uppercase tracking-wider font-bold">
                    {deploying ? 'Deploying...' : 'Push to Live'}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible asChild className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="h-10 text-white/50 hover:text-white px-3 justify-start gap-3 w-full">
                      <ImageIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs uppercase tracking-wider font-bold">Media CDN</span>
                      <ChevronRight className="ml-auto w-4 h-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="border-l border-white/5 ml-4 mt-1 gap-1 pl-2">
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          onClick={() => !mediaSyncing && runMediaSync()}
                          className={cn("text-[11px] uppercase py-2 flex items-center text-left w-full", mediaSyncing ? "text-white/20 pointer-events-none" : "text-white/40 hover:text-white")}
                        >
                          {mediaSyncing ? <Loader2 className="animate-spin w-3 h-3 mr-2 shrink-0" /> : <Zap className="w-3 h-3 mr-2 text-primary shrink-0" />}
                          {mediaSyncing ? 'Syncing...' : 'Sync CDN Assets'}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={mode === 'systems' && activeTab === 'media'}
                          onClick={() => { setMode('systems'); setActiveTab('media'); }}
                          className={cn(
                            "text-[11px] uppercase py-2 flex items-center text-left w-full",
                            mode === 'systems' && activeTab === 'media' ? "text-primary font-bold" : "text-white/40 hover:text-white"
                          )}
                        >
                          <Library className="w-3 h-3 mr-2 shrink-0" />
                          Asset Explorer
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Resources Dropdown */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] font-mono uppercase font-bold text-white/20 tracking-[0.2em] mb-3 px-2">
            Resources
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="h-10 text-white/50 hover:text-white px-3 w-full justify-start gap-3">
                <a href="https://www.facebook.com/groups/135339659870615" target="_blank" rel="noopener noreferrer">
                  <Facebook className="w-4 h-4 text-[#1877F2] flex-shrink-0" />
                  <span className="text-xs uppercase tracking-wider font-bold">Community</span>
                  <ExternalLink className="w-3 h-3 ml-auto opacity-30 flex-shrink-0" />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}