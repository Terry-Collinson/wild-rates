
'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useStorage, useCollection, useMemoFirebase, useUser, useProfile } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { FileText, Upload, Trash2, Loader2, Link as LinkIcon, FileDown, Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMIN_EMAILS = ['reservations@amakhala.com', 'terry_collinson@debono.net'];
import { INITIAL_LODGES } from '@/lib/mock-data';
import { ShieldAlert } from 'lucide-react';

interface SanctuaryDocument {
  id?: string;
  title: string;
  description: string;
  url: string;
  category: string;
  fileName: string;
  fileSize: number;
  uploadedAt: any;
  lodgeId: string;
}

export default function DocumentAdminPage() {
  const { profile, loading: loadingProfile } = useProfile();
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Handbook');
  const [description, setDescription] = useState('');
  const [selectedLodgeId, setSelectedLodgeId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!loadingProfile && !profile) {
      // Logic handled in JSX
    }
  }, [profile, loadingProfile]);

  const managed_lodge_ids = profile?.managed_lodge_ids || [];
  const isSuperAdmin = profile?.role === 'super_admin' || ADMIN_EMAILS.some(email => email.toLowerCase() === user?.email?.toLowerCase());
  const hasAccess = isSuperAdmin || managed_lodge_ids.length > 0;

  const lodgesQuery = useMemoFirebase(() => db ? collection(db, 'lodges') : null, [db]);
  const { data: dbLodges } = useCollection<any>(lodgesQuery);
  const lodgesList = dbLodges && dbLodges.length > 0 ? dbLodges : INITIAL_LODGES;

  const filteredLodges = isSuperAdmin 
    ? lodgesList 
    : lodgesList.filter(l => managed_lodge_ids.includes(l.id));

  const docsQuery = useMemoFirebase(() => {
    if (!db || !hasAccess) return null;
    if (isSuperAdmin) return collection(db, 'documents');
    return query(collection(db, 'documents'), where('lodgeId', 'in', managed_lodge_ids));
  }, [db, isSuperAdmin, managed_lodge_ids, hasAccess]);
  const { data: documents, loading } = useCollection<SanctuaryDocument>(docsQuery);

  const handleUpload = async () => {
    if (!db || !storage || !file || !title || (!isSuperAdmin && !selectedLodgeId)) {
      toast({ title: "Validation Error", description: "All fields including lodge assignment are required.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(pct);
        },
        (error) => {
          setUploading(false);
          toast({ 
            title: "Upload Failed", 
            description: error.message, 
            variant: "destructive" 
          });
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          await addDoc(collection(db, 'documents'), {
            title,
            description,
            url: downloadURL,
            category,
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: serverTimestamp(),
            lodgeId: selectedLodgeId || 'all_sanctuaries',
          });

          toast({ 
            title: "Document Sync Complete", 
            description: `${title} is now available in the Sanctuary Library.` 
          });
          
          setUploading(false);
          setProgress(0);
          setFile(null);
          setTitle('');
          setDescription('');
        }
      );
    } catch (error: any) {
      setUploading(false);
      toast({ title: "System Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (document: SanctuaryDocument) => {
    if (!db || !storage || !document.id) return;

    try {
      await deleteDoc(doc(db, 'documents', document.id));
      
      if (document.url.includes('firebasestorage')) {
        const storageRef = ref(storage, document.url);
        await deleteObject(storageRef);
      }

      toast({ title: "Document Removed" });
    } catch (error: any) {
      toast({ title: "Removal Error", description: error.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "Link Copied", description: "URL is now in your clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loadingUser || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push('/hero-join');
    return null;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6 text-center">
        <Navbar />
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-headline italic font-bold text-white mb-2">Restricted Access</h1>
        <p className="text-white/40 max-w-md mb-8">
          Your account is not currently assigned to any lodges. Please contact the system administrator to provision your access scope.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button asChild className="rounded-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white">
            <Link href="mailto:reservations@amakhala.com">Contact System Admin</Link>
          </Button>
          <Button variant="ghost" className="text-white/40 hover:text-white" onClick={() => router.push('/portal')}>
            Return to Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-24 text-foreground bg-background">
      <Navbar />
      
      <div className="pt-32 pb-12 bg-black/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-headline font-bold">Sanctuary Librarian</h1>
              <p className="text-primary font-bold uppercase tracking-widest text-xs">Manage Digital Resources & Guardianship Assets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card className="glass-card border-white/5 bg-black/40">
            <CardHeader>
              <CardTitle className="text-xl font-headline italic flex items-center gap-2 text-white">
                <Upload className="w-5 h-5 text-primary" />
                Upload Resource
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2024 Conservation Map" className="bg-white/5 border-white/10" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Handbook">Handbook</SelectItem>
                    <SelectItem value="Map">Map</SelectItem>
                    <SelectItem value="Policy">Policy</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Assign to Sanctuary</Label>
                <Select value={selectedLodgeId} onValueChange={setSelectedLodgeId}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select Sanctuary" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && <SelectItem value="all_sanctuaries">Global / All Sanctuaries</SelectItem>}
                    {filteredLodges.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Internal memo or public guide?" className="bg-white/5 border-white/10" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Select File</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="bg-white/5 border-white/10 h-auto py-2" />
              </div>

              {uploading && (
                <div className="space-y-2 py-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary">
                    <span>Uploading...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-1 bg-white/10" />
                </div>
              )}

              <Button 
                onClick={handleUpload} 
                disabled={uploading || !file || !title} 
                className="w-full bg-primary text-primary-foreground font-bold rounded-full h-12 shadow-lg shadow-primary/20"
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? 'Syncing to Cloud...' : 'Add to Sanctuary Library'}
              </Button>
            </CardContent>
          </Card>
          
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/60 leading-relaxed italic">
              <strong>Note:</strong> Files uploaded here are secured via Firebase Storage and indexed in the Sanctuary Library for all verified Guardians.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-primary w-5 h-5" />
            <h2 className="text-2xl font-headline font-bold">Digital Archives</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              </div>
            ) : documents?.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-muted-foreground italic border-2 border-dashed border-white/5 rounded-3xl">
                The archives are currently empty.
              </div>
            ) : (
              documents?.map((doc) => (
                <Card key={doc.id} className="glass-card border-white/5 bg-black/40 overflow-hidden group hover:border-primary/30 transition-all">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                        <FileDown className="w-6 h-6 text-primary" />
                      </div>
                      <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-primary/30 text-primary">
                        {doc.category}
                      </Badge>
                    </div>
                    <div className="space-y-1 mb-6">
                      <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{doc.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{doc.description || 'Verified sanctuary resource.'}</p>
                      <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">
                        {doc.fileName} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB • {filteredLodges.find(l => l.id === doc.lodgeId)?.name || 'Global'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild className="flex-1 border-white/10 hover:border-primary/50 rounded-lg h-9 bg-white/5">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <LinkIcon className="w-3 h-3 mr-2" />
                          View
                        </a>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => doc.id && copyToClipboard(doc.url, doc.id)} 
                        className="flex-1 border-white/10 hover:border-primary/50 rounded-lg h-9 bg-white/5"
                      >
                        {copiedId === doc.id ? <Check className="w-3 h-3 mr-2 text-green-400" /> : <Copy className="w-3 h-3 mr-2" />}
                        Copy Link
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)} className="text-destructive hover:bg-destructive/10 rounded-lg h-9">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
