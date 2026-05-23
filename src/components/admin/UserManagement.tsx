"use client"

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Users, Shield, Edit, Mail, Trash2, Plus, Key } from 'lucide-react';
import { INITIAL_LODGES } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  isHero?: boolean;
  managed_lodge_ids?: string[];
}

export default function UserManagement() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const lodgesQuery = useMemoFirebase(() => db ? collection(db, 'lodges') : null, [db]);
  const { data: dbLodges } = useCollection<any>(lodgesQuery);
  const lodgesList = dbLodges && dbLodges.length > 0 ? dbLodges : INITIAL_LODGES;
  
  const usersQuery = useMemoFirebase(() => db ? query(collection(db, 'users')) : null, [db]);
  const { data: users, loading } = useCollection<UserProfile>(usersQuery);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedLodges, setSelectedLodges] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provUid, setProvUid] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const auth = useAuth();

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setSelectedRole(user.role || 'guest');
    setSelectedLodges(user.managed_lodge_ids || []);
    setDialogOpen(true);
  };

  const handleLodgeToggle = (lodgeId: string, checked: boolean) => {
    if (checked) {
      setSelectedLodges(prev => [...prev, lodgeId]);
    } else {
      setSelectedLodges(prev => prev.filter(id => id !== lodgeId));
    }
  };

  const saveUser = async () => {
    if (!db || !editingUser) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        role: selectedRole,
        managed_lodge_ids: selectedLodges
      });
      toast({ title: "User Updated", description: "Access privileges have been saved." });
      setDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!db) return;
    if (confirm(`Are you sure you want to permanently delete the profile for ${email}? They will lose all dashboard access.`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        toast({ title: "User Deleted", description: "The user profile has been removed from Firestore." });
      } catch (error: any) {
        toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
      }
    }
  };

  const handleResetPassword = async (email: string | undefined) => {
    if (!auth || !email) {
      toast({ title: "Reset Failed", description: "No email available.", variant: "destructive" });
      return;
    }
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Reset Email Sent", description: `Password reset link sent to ${email}.` });
    } catch (error: any) {
      toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleProvision = async () => {
    if (!db || !provUid.trim() || !provEmail.trim()) {
      toast({ title: "Validation Error", description: "UID and Email are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', provUid.trim()), {
        email: provEmail.trim(),
        role: 'guest',
        isHero: true,
        managed_lodge_ids: []
      });
      toast({ title: "Identity Provisioned", description: "User has been added and can now be assigned roles." });
      setProvUid('');
      setProvEmail('');
      setProvisionOpen(false);
    } catch (error: any) {
      toast({ title: "Provisioning Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <Card className="glass-card border-white/5 bg-black/40 rounded-[2.5rem] overflow-hidden shadow-2xl">
      <CardHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-3xl font-headline italic text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Access Management
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">
            View and edit user roles and sanctuary assignments
          </CardDescription>
        </div>
        <Button 
          onClick={() => setProvisionOpen(true)}
          className="bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Provision Identity
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">User Identity</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Security Role</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Assigned Sanctuaries</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <Mail className="w-4 h-4 text-white/50" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-white text-sm">{user.email || 'Unknown Email'}</p>
                        <p className="text-[10px] text-white/40 font-mono">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <Badge variant="outline" className={`
                      text-[10px] uppercase font-black tracking-widest px-3 py-1 border-0
                      ${user.role === 'super_admin' ? 'bg-primary/20 text-primary' : 
                        user.role === 'lodge_admin' ? 'bg-emerald-500/20 text-emerald-400' : 
                        'bg-white/10 text-white/60'}
                    `}>
                      {user.role === 'super_admin' ? 'ROOT' : user.role === 'lodge_admin' ? 'LODGE ADMIN' : 'GUEST'}
                    </Badge>
                  </td>
                  <td className="px-10 py-6">
                    {user.role === 'super_admin' ? (
                      <span className="text-xs font-mono text-primary/60">GLOBAL ACCESS</span>
                    ) : user.managed_lodge_ids?.length ? (
                      <div className="flex gap-2 flex-wrap max-w-xs">
                        {user.managed_lodge_ids.map(id => {
                          const lodgeName = lodgesList.find(l => l.id === id)?.name || id;
                          return (
                            <span key={id} className="text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded uppercase tracking-widest">
                              {lodgeName}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/20 italic">No access</span>
                    )}
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        onClick={() => openEditModal(user)}
                        className="text-white/40 hover:text-white hover:bg-white/5 h-8 px-3"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Privileges
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => deleteUser(user.id, user.email || 'Unknown')}
                        className="text-red-500/50 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0c0c0c] border-white/10 text-white max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline italic text-white flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              Modify Access Privileges
            </DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-8 py-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Target Identity</p>
                <p className="text-lg font-bold">{editingUser.email}</p>
              </div>

              <div className="space-y-4">
                <Label className="text-xs uppercase tracking-widest text-white/60 font-bold">Security Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="bg-black border-white/10 h-12">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c0c0c] border-white/10 text-white">
                    <SelectItem value="super_admin">Root / Super Admin (Global Access)</SelectItem>
                    <SelectItem value="lodge_admin">Lodge Administrator (Restricted)</SelectItem>
                    <SelectItem value="guest">Guest (Read Only / No Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole === 'lodge_admin' && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <Label className="text-xs uppercase tracking-widest text-white/60 font-bold">Sanctuary Assignments</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {lodgesList.map(lodge => (
                      <div key={lodge.id} className="flex items-center space-x-3 bg-black/40 p-3 rounded-lg border border-white/5">
                        <Checkbox 
                          id={`lodge-${lodge.id}`} 
                          checked={selectedLodges.includes(lodge.id)}
                          onCheckedChange={(c) => handleLodgeToggle(lodge.id, !!c)}
                          className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-black"
                        />
                        <label 
                          htmlFor={`lodge-${lodge.id}`}
                          className="text-sm font-medium leading-none cursor-pointer hover:text-white text-white/70"
                        >
                          {lodge.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/40 hover:text-white">
                  Cancel
                </Button>
                <Button onClick={saveUser} disabled={isSaving} className="bg-primary text-black hover:bg-primary/90 font-bold uppercase tracking-widest">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                  Save Privileges
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
        <DialogContent className="bg-[#0c0c0c] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline italic text-white flex items-center gap-3">
              <Plus className="w-5 h-5 text-emerald-400" />
              Provision Identity
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400/90 leading-relaxed">
              Manually inject a database profile for a user that was created in the Authentication console but hasn't logged in yet.
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">User Email</Label>
                <Input 
                  placeholder="e.g. admin@amakhala.test" 
                  value={provEmail} 
                  onChange={(e) => setProvEmail(e.target.value)}
                  className="bg-black/40 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Firebase Auth UID</Label>
                <Input 
                  placeholder="Paste exactly from Firebase Console" 
                  value={provUid} 
                  onChange={(e) => setProvUid(e.target.value)}
                  className="bg-black/40 border-white/10 font-mono text-sm text-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
              <Button variant="ghost" onClick={() => setProvisionOpen(false)} className="text-white/40 hover:text-white">
                Cancel
              </Button>
              <Button onClick={handleProvision} disabled={isSaving} className="bg-emerald-500 text-black hover:bg-emerald-400 font-bold uppercase tracking-widest">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Inject Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
