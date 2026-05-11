import type { Metadata } from 'next';

import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import Footer from '@/components/Footer';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Wild Rates | Exclusive Access & Direct Guardianship',
  description: 'Reserved member rates for Amakhala Game Reserve. Bypass external fees and support frontline conservation directly.',
  icons: {
    icon: '/icons/favicon.ico',
    shortcut: '/icons/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background safari-gradient text-foreground selection:bg-primary/30 flex flex-col">
        <FirebaseClientProvider>
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          <div className="flex-grow">
            {children}
          </div>
          <Footer />
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
