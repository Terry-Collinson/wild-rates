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

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <Link href="/admin" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4 group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-[10px] font-black uppercase tracking-widest">Back to Dashboard</span>
            </Link>
            <h1 className="text-4xl font-headline italic">Media Asset Explorer</h1>
            <p className="text-white/40 text-sm">Direct access to external sanctuary imagery across the reserve.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={testScraper} 
              variant="outline" 
              className="border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400 rounded-full px-6"
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
              className="border-primary/20 hover:bg-primary/10 text-primary rounded-full px-6"
              disabled={loading || !!syncing}
            >
              {syncing && syncing !== 'Test Scrape' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Deep Sync All
            </Button>
            <Button 
              onClick={fetchMedia} 
              variant="outline" 
              className="border-white/10 hover:bg-white/5 rounded-full px-6"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
          </div>
        </header>

        {error && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-primary font-black uppercase tracking-widest text-[10px]">Scanning Reserve Database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((room: any, idx: number) => (
              <Card key={idx} className="bg-black/40 border-white/5 overflow-hidden rounded-3xl group hover:border-primary/30 transition-all duration-500">
                <CardHeader className="p-6 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <Badge variant="outline" className="w-fit border-primary/30 text-primary text-[8px] uppercase tracking-widest px-2">{room.propertyName}</Badge>
                      <CardTitle className="text-xl font-headline italic text-white group-hover:text-primary transition-colors">{room.roomName}</CardTitle>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => deepSyncRoom(room)}
                      disabled={!!syncing}
                      className="text-primary hover:bg-primary/10 h-8 px-3 rounded-full border border-primary/20"
                    >
                      {syncing === room.roomName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      <span className="ml-2 text-[10px] font-black uppercase tracking-widest">Sync</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">External Assets ({room.urls.length})</p>
                    <div className="space-y-2">
                      {room.urls.map((url: string, urlIdx: number) => (
                        <div key={urlIdx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center flex-shrink-0 border border-white/5">
                              <span className="text-[10px] font-bold text-primary">{urlIdx + 1}</span>
                            </div>
                            <span className="text-[10px] text-white/60 truncate font-mono">{url.split('/').pop()?.substring(0, 20)}...</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" asChild>
                              <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 hover:bg-emerald-400/10 rounded-lg" asChild>
                              <a href={url} download={`${room.propertyName}-${room.roomName}-${urlIdx+1}.jpg`} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><Download className="w-3.5 h-3.5" /></a>
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
    </div>
  );
}
