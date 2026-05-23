'use client';

import { useState } from 'react';
import { useUser } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { User, Settings, LogOut, Check, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AdminNavbar({ lodgeName }: { lodgeName: string }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // Modal states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user || !db) return;
    setIsSaving(true);

    try {
      // 1. Update Firebase Auth Profile Name
      await updateProfile(user, { displayName: displayName });

      // 2. Sync the name change down to your Firestore users document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: displayName,
        updatedAt: new Date()
      });

      toast({
        title: "Profile Updated",
        description: "Your display name has been synced successfully.",
      });
      setIsProfileOpen(false);
    } catch (error) {
      console.error("Profile update failed:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save your changes. Try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <header className="w-full h-16 border-b border-white/5 bg-black/40 backdrop-blur-md px-6 flex items-center justify-between z-50">
        {/* Left Side: Scope Context Indicator */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-primary/10 text-primary uppercase font-bold tracking-widest px-2.5 py-1 rounded-md border border-primary/20">
            {lodgeName}
          </span>
        </div>

        {/* Right/Top Side: Secure User Controls */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'A')}
                </div>
                <span className="text-xs font-medium text-white/70 max-w-[120px] truncate hidden sm:inline">
                  {user?.displayName || 'Admin Options'}
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-[#0c0c0c] border-white/10 text-white">
              <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                My Account
              </DropdownMenuLabel>
              <div className="px-2 py-1.5 text-xs font-semibold max-w-full truncate text-white/90">
                {user?.email}
              </div>
              <DropdownMenuSeparator className="bg-white/5" />

              {/* Profile Link Action */}
              <DropdownMenuItem
                onClick={() => { setDisplayName(user?.displayName || ''); setIsProfileOpen(true); }}
                className="cursor-pointer focus:bg-white/5 focus:text-white flex items-center gap-2"
              >
                <User className="w-4 h-4 text-primary" />
                <span>Edit Profile Details</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-white/40" />
                <span>Preferences</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Elegant Popover Dialog Frame for Editing Details */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="bg-[#0c0c0c] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl text-white">Edit Profile Parameters</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name..."
                className="bg-black/40 border-white/10 text-white focus-visible:ring-primary focus-visible:ring-offset-0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsProfileOpen(false)}
              className="hover:bg-white/5 text-white/60 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-black font-bold"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}