'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Loader2, 
  Image as ImageIcon, 
  ExternalLink, 
  Download, 
  ChevronRight,
  ArrowLeft,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  SidebarProvider, 
  SidebarInset 
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

interface RoomTypeImage {
  roomName: string;
  propertyName: string;
  urls: string[];
}

export default function MediaExplorerPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const toKebabCase = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const deepSyncRoom = async (room: any) => {
    setSyncing(room.roomName);
    const cleanPropertyName = room.propertyName.split('-')[0].trim();
    const folderName = toKebabCase(cleanPropertyName);
    const roomFileNameBase = toKebabCase(room.roomName);
    
    const localImages: string[] = [];

    try {
      for (let i = 0; i < room.urls.length; i++) {
        const url = room.urls[i];
        const fileName = `${roomFileNameBase}-${i + 1}.jpg`;
        
        try {
          const saveRes = await fetch('/api/admin/save-media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              folderName,
              fileName
            })
          });

          if (saveRes.ok) {
            const saveResult = await saveRes.json();
            localImages.push(saveResult.path);
          }
        } catch (fetchErr) {
          console.error('Fetch error:', fetchErr);
        }
      }

      // 4. Update Firestore via REST
      if (localImages.length > 0) {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'booking-service-1c217';
        const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/room_types/${room.id}?updateMask.fieldPaths=localImages&updateMask.fieldPaths=localImage&updateMask.fieldPaths=mediaSyncedAt`;
        
        await axios.patch(updateUrl, {
          fields: {
            localImages: { arrayValue: { values: localImages.map(url => ({ stringValue: url })) } },
            localImage: { stringValue: localImages[0] },
            mediaSyncedAt: { stringValue: new Date().toISOString() }
          }
        });
      }
    } catch (err) {
      console.error('Deep Sync Error:', err);
    } finally {
      setSyncing(null);
    }
  };

  const testScraper = async () => {
    setSyncing('Test Scrape');
    try {
      const saveRes = await fetch('/api/admin/save-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1920&auto=format&fit=crop',
          folderName: 'test-folder',
          fileName: 'test-image.jpg'
        })
      });

      if (saveRes.ok) {
        const saveResult = await saveRes.json();
        alert(`Success! Image saved to: ${saveResult.path}`);
      } else {
        const errResult = await saveRes.json();
        alert(`Failed: ${errResult.error || saveRes.statusText}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  };

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'booking-service-1c217';
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

      // 1. Fetch Properties for naming
      const propRes = await axios.get(`${baseUrl}/properties?pageSize=100`);
      const propertyMap = new Map<string, string>();
      if (propRes.data.documents) {
        propRes.data.documents.forEach((doc: any) => {
          const id = doc.name.split('/').pop();
          propertyMap.set(id, doc.fields?.name?.stringValue || id);
        });
      }

      // 2. Fetch Room Types
      const roomRes = await axios.get(`${baseUrl}/room_types?pageSize=100`);
      const roomDocs = roomRes.data.documents || [];

      const results: RoomTypeImage[] = roomDocs.map((doc: any) => {
        const fields = doc.fields || {};
        const roomDocId = doc.name.split('/').pop();
        
        let propertyId = fields.property_id?.stringValue || fields.lodgeId?.stringValue || fields.propertyId?.stringValue;
        if (!propertyId && roomDocId.includes('_')) {
          propertyId = roomDocId.split('_')[0];
        }

        const roomName = fields.name?.stringValue || fields.roomName?.stringValue || 'Untitled Room';
        const propertyName = propertyMap.get(propertyId) || fields.lodgeName?.stringValue || 'Unknown Sanctuary';

        const urls: string[] = [];
        const imagesField = fields.images?.arrayValue?.values || [];
        imagesField.forEach((val: any) => {
          if (val.stringValue) urls.push(val.stringValue);
        });

        if (urls.length === 0) {
          const single = fields.image?.stringValue || fields.url?.stringValue;
          if (single) urls.push(single);
        }

        return { id: roomDocId, roomName, propertyName, urls };
      });

      setData(results);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [sidebarActiveTab, setSidebarActiveTab] = useState('media');
  const [sidebarMode, setSidebarMode] = useState<'operations' | 'systems'>('systems');
  const [sidebarLodgeFilter, setSidebarLodgeFilter] = useState('all');

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#080808] text-white selection:bg-primary/30">
        <AdminSidebar 
          activeTab={sidebarActiveTab}
          setActiveTab={setSidebarActiveTab}
          mode={sidebarMode}
          setMode={setSidebarMode}
          activeLodgeFilter={sidebarLodgeFilter}
          setActiveLodgeFilter={setSidebarLodgeFilter}
          runMediaSync={fetchMedia}
          mediaSyncing={loading}
        />
        <SidebarInset className="bg-transparent border-l border-white/5">
          <div className="p-8 md:p-12 space-y-12 max-w-[1600px] mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">System Assets</span>
                  <div className="h-px w-8 bg-primary/20" />
                </div>
                <h1 className="text-4xl font-headline italic font-bold">Media Inventory</h1>
                <p className="text-white/30 text-sm font-medium">Direct access to external sanctuary imagery and automated sync engine.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button 
                  onClick={testScraper} 
                  variant="outline" 
                  className="border-white/10 hover:bg-white/5 text-white/60 rounded-xl h-12 px-6 text-[10px] font-black uppercase tracking-widest"
                  disabled={loading || !!syncing}
                >
                  {syncing === 'Test Scrape' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  Test Scraper
                </Button>
                <Button 
                  onClick={async () => {
                    for (const room of data) await deepSyncRoom(room);
                  }} 
                  variant="outline" 
                  className="border-primary/20 hover:bg-primary/10 text-primary rounded-xl h-12 px-6 text-[10px] font-black uppercase tracking-widest"
                  disabled={loading || !!syncing}
                >
                  {syncing && syncing !== 'Test Scrape' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  Deep Sync All
                </Button>
                <Button 
                  onClick={fetchMedia} 
                  variant="outline" 
                  className="border-white/10 hover:bg-white/5 rounded-xl h-12 px-6 text-[10px] font-black uppercase tracking-widest"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                  Refresh
                </Button>
              </div>
            </header>

            {error && (
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-mono text-xs">
                SYSTEM_ERROR: {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                  <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
                </div>
                <p className="text-primary font-black uppercase tracking-[0.4em] text-[9px] animate-pulse">Scanning Reserve Inventory...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {data.map((room: any, idx: number) => (
                  <Card key={idx} className="bg-[#0c0c0c] border border-white/5 overflow-hidden rounded-xl group hover:border-primary/30 transition-all duration-500 shadow-2xl relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                    <CardHeader className="p-6 pb-2 relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <Badge variant="outline" className="w-fit border-white/10 text-white/40 text-[8px] uppercase tracking-widest px-2 font-black">{room.propertyName}</Badge>
                          <CardTitle className="text-lg font-headline italic text-white group-hover:text-primary transition-colors leading-tight">{room.roomName}</CardTitle>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => deepSyncRoom(room)}
                          disabled={!!syncing}
                          className="text-primary hover:bg-primary/10 h-8 px-2 rounded-lg border border-primary/20"
                        >
                          {syncing === room.roomName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-2 space-y-4 relative z-10">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-white/20 tracking-widest">External Assets ({room.urls.length})</p>
                        <div className="space-y-2">
                          {room.urls.map((url: string, urlIdx: number) => (
                            <div key={urlIdx} className="flex items-center justify-between p-2.5 bg-black/40 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                                  <span className="text-[9px] font-black text-primary">{urlIdx + 1}</span>
                                </div>
                                <span className="text-[10px] text-white/40 truncate font-mono">{url.split('/').pop()?.substring(0, 15)}...</span>
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-white/30 hover:text-primary hover:bg-primary/10 rounded" asChild>
                                  <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ExternalLink className="w-3 h-3" /></a>
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-white/30 hover:text-emerald-400 hover:bg-emerald-400/10 rounded" asChild>
                                  <a href={url} download={`${room.propertyName}-${room.roomName}-${urlIdx+1}.jpg`} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><Download className="w-3 h-3" /></a>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
