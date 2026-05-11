"use client"

import * as React from "react"
import {
  LayoutDashboard,
  MapPin,
  Zap,
  Library,
  ClipboardList,
  Globe,
  TrendingUp,
  Database,
  ImageIcon,
  ChevronRight,
  Shield,
  Loader2,
  Eye, // Added for WildEye branding
  Activity,
  LineChart
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
import Link from "next/link"

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mode: 'operations' | 'systems';
  setMode: (mode: 'operations' | 'systems') => void;
  activeLodgeFilter: string;
  setActiveLodgeFilter: (filter: string) => void;
  runMediaSync: () => void;
  mediaSyncing: boolean;
}

export function AdminSidebar({
  activeTab,
  setActiveTab,
  mode,
  setMode,
  activeLodgeFilter,
  setActiveLodgeFilter,
  runMediaSync,
  mediaSyncing
}: AdminSidebarProps) {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b border-white/5 p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center shadow-lg shadow-primary/10">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest text-white">WildRates</span>
            <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">Command Center</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Operations Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Operations</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeTab === 'overview'}
                onClick={() => { setMode('operations'); setActiveTab('overview'); }}
                tooltip="Overview"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <Collapsible asChild defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Lodges">
                    <MapPin className="w-4 h-4" />
                    <span>Lodge Registry</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={activeTab === 'sanctuaries' && activeLodgeFilter === 'all'}
                        onClick={() => { setMode('operations'); setActiveTab('sanctuaries'); setActiveLodgeFilter('all'); }}
                      >
                        <span>All Sanctuaries</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {INITIAL_LODGES.map((lodge) => (
                      <SidebarMenuSubItem key={lodge.id}>
                        <SidebarMenuSubButton
                          isActive={activeTab === 'sanctuaries' && activeLodgeFilter === lodge.id}
                          onClick={() => { setMode('operations'); setActiveTab('sanctuaries'); setActiveLodgeFilter(lodge.id); }}
                        >
                          <span>{lodge.name}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeTab === 'bookings'}
                onClick={() => { setMode('operations'); setActiveTab('bookings'); }}
                tooltip="Direct Requests"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Direct Requests</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* WildEye Section - RE-BRANDED */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-[10px] uppercase font-bold text-emerald-500/60 tracking-widest">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            WildEye Analytics
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeTab === 'intelligence'}
                onClick={() => { setMode('operations'); setActiveTab('intelligence'); }}
                tooltip="WildEye Terminal"
                className={activeTab === 'intelligence' ? "bg-emerald-500/5 text-emerald-500 border-r-2 border-emerald-500/50" : ""}
              >
                <Eye className={activeTab === 'intelligence' ? "text-emerald-500" : "w-4 h-4"} />
                <span className="flex items-center justify-between w-full">
                  WildEye Terminal
                  <Badge className="bg-emerald-500/20 text-emerald-500 text-[8px] font-black px-1 py-0">LIVE</Badge>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Demand Heatmap">
                <Activity className="w-4 h-4" />
                <span>Regional Demand</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Parity Guard">
                <LineChart className="w-4 h-4" />
                <span>Parity Guard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Systems Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Systems</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={mode === 'systems'}
                onClick={() => setMode('systems')}
                tooltip="Infrastructure"
              >
                <Database className="w-4 h-4" />
                <span>Core Foundation</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <Collapsible asChild className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="Media Assets">
                    <ImageIcon className="w-4 h-4" />
                    <span>Media Assets</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => !mediaSyncing && runMediaSync()}
                        className={mediaSyncing ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
                      >
                        {mediaSyncing ? <Loader2 className="animate-spin mr-2 w-3.5 h-3.5" /> : <Zap className="mr-2 w-3.5 h-3.5 text-primary" />}
                        <span>{mediaSyncing ? 'Syncing...' : 'Sync CDN Assets'}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <Link href="/admin/media">
                          <Library className="mr-2 w-3.5 h-3.5" />
                          <span>Asset Explorer</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

// Utility Badge Component if not already available in your UI lib
const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("px-1.5 py-0.5 rounded-md leading-none", className)}>
    {children}
  </span>
)

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");