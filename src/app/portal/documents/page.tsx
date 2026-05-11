
'use client';

import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { FileDown, ShieldCheck, Download, Search, Loader2, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface SanctuaryDocument {
  id?: string;
  title: string;
  description: string;
  url: string;
  category: string;
  fileName: string;
  fileSize: number;
  uploadedAt: any;
}

export default function DocumentPortalPage() {
  const db = useFirestore();
  const [search, setSearch] = useState('');

  const docsQuery = useMemoFirebase(() => db ? collection(db, 'documents') : null, [db]);
  const { data: rawDocuments, loading } = useCollection<SanctuaryDocument>(docsQuery);

  const documents = rawDocuments?.filter(doc => 
    doc.title.toLowerCase().includes(search.toLowerCase()) || 
    doc.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen pb-24 text-foreground bg-background">
      <Navbar />
      
      <div className="pt-32 pb-12 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-primary mx-auto" />
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-white italic">Sanctuary <span className="text-primary">Library</span></h1>
          <p className="text-primary font-bold uppercase tracking-[0.3em] text-[10px]">Guardianship Handbooks, Maps & Policies</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or category..." 
            className="h-14 pl-12 bg-white/5 border-white/10 rounded-full text-lg shadow-2xl focus:border-primary/50 transition-all"
          />
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-4">Accessing Archives...</p>
          </div>
        ) : documents?.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <p className="text-xl font-headline italic text-white/40">No matching records found.</p>
            <Button variant="ghost" onClick={() => setSearch('')} className="text-primary font-bold">Clear Search Filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents?.map((doc) => (
              <Card key={doc.id} className="glass-card border-white/5 bg-black/40 p-1 group hover:border-primary/30 transition-all shadow-2xl rounded-[2rem] overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 group-hover:bg-primary/20 transition-colors">
                      <FileDown className="w-6 h-6 text-primary" />
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/30 text-[9px] uppercase font-black px-3 py-1.5 rounded-full">
                      {doc.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-headline italic text-white group-hover:text-primary transition-colors">{doc.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-white/60 leading-relaxed italic line-clamp-2 min-h-[3rem]">
                    {doc.description || 'Verified sanctuary resource for direct supporters.'}
                  </p>
                  
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Storage</span>
                      <span className="text-xs font-bold text-white/50">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <Button asChild className="bg-primary text-primary-foreground font-black rounded-full px-8 hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                      <a href={doc.url} download={doc.fileName} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="max-w-4xl mx-auto pt-12 pb-20">
          <div className="bg-primary/5 border border-primary/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-headline italic text-white">The Guardian Standard</h3>
              <p className="text-sm text-white/60 leading-relaxed italic">
                These documents are shared in confidence for use by verified Amakhala Guardians. Please do not distribute reserved materials outside the community.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
