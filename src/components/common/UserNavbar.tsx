"use client";

import React, { useState } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { signOut, updateProfile, updateEmail, sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function UserNavbar() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const { toast } = useToast();

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/hero-join');
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0c0c0c]/80 backdrop-blur-xl border-b border-white/10 h-14 flex items-center px-4">
      <div className="flex items-center gap-3 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10">
              <User className="h-4 w-4 text-white/70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#0c0c0c] border-white/10 text-white">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.displayName || 'User'}</p>
                <p className="text-xs leading-none text-white/40">{user?.email || ''}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="hover:bg-white/5 focus:bg-white/5 cursor-pointer text-white/80" onClick={() => setProfileOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Edit Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="hover:bg-white/5 focus:bg-white/5 cursor-pointer text-red-400 focus:text-red-400" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="bg-[#0c0c0c] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline italic text-white flex items-center gap-3">
              <Settings className="w-5 h-5 text-primary" />
              Edit Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/60 font-bold">Display Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-black/40 border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/60 font-bold">Email</label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-black/40 border-white/10" />
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
              <Button variant="ghost" onClick={() => setProfileOpen(false)} className="text-white/40 hover:text-white">
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!auth || !auth.currentUser) return;
                  try {
                    await updateProfile(auth.currentUser, { displayName: newName });
                    if (newEmail !== auth.currentUser.email) {
                      await updateEmail(auth.currentUser, newEmail);
                    }
                    toast({ title: 'Profile Updated', description: 'Your details have been saved.' });
                    setProfileOpen(false);
                  } catch (error: any) {
                    toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
                  }
                }}
                className="bg-primary text-black hover:bg-primary/90 font-bold uppercase tracking-widest"
              >
                Save Changes
              </Button>
            </div>
            <div className="border-t border-white/10 pt-4">
              <Button
                variant="outline"
                onClick={async () => {
                  if (!auth || !newEmail) return;
                  try {
                    await sendPasswordResetEmail(auth, newEmail);
                    toast({ title: 'Reset Email Sent', description: `Password reset link sent to ${newEmail}.` });
                  } catch (error: any) {
                    toast({ title: 'Reset Failed', description: error.message, variant: 'destructive' });
                  }
                }}
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
              >
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
