
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full py-12 border-t border-white/5 bg-black/20">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start space-y-2">
          <p className="text-sm font-headline italic text-white/40">Wild Rates & Amakhala Guardianship</p>
          <p className="text-[10px] text-white/20 uppercase tracking-widest">© {new Date().getFullYear()} All Rights Reserved</p>
        </div>
        
        <div className="flex items-center gap-8 text-[10px] uppercase tracking-widest font-bold text-white/20">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="/deletion" className="hover:text-primary transition-colors">User Data Deletion</Link>
          <a href="mailto:reservations@amakhala.com" className="hover:text-primary transition-colors">Contact Support</a>
        </div>
      </div>
    </footer>
  );
}
