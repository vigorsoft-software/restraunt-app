"use client"

import { CartProvider } from '@/hooks/use-cart';
import { Navbar } from '@/components/layout/Navbar';
import { MenuGrid } from '@/components/menu/MenuGrid';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-bg');

  return (
    <CartProvider>
      <div className="min-h-screen relative">
        <Navbar />
        
        {/* Hero Section */}
        <header className="relative h-[70vh] w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image 
              src={heroImage?.imageUrl || ''} 
              alt="Galaxy Grand Cafe Hero" 
              fill 
              priority
              className="object-cover opacity-40 grayscale-[0.5]"
              data-ai-hint="luxury restaurant kitchen"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
          </div>

          <div className="relative z-10 text-center space-y-6 max-w-4xl px-4 mt-20">
            <h1 className="text-6xl md:text-8xl font-headline italic tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-1000">
              Your Daily <span className="text-primary">Coffee Fix</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
              Freshly brewed coffee and artisanal snacks, crafted with love and delivered to your doorstep.
            </p>
          </div>
        </header>

        {/* Menu Section */}
        <main className="max-w-7xl mx-auto px-4 mt-[-5rem] relative z-20">
          <MenuGrid />
        </main>

        <footer className="py-20 border-t border-border/50 text-center">
          <div className="max-w-7xl mx-auto px-4 space-y-4">
            <h2 className="text-3xl font-headline text-primary">Galaxy Grand Cafe</h2>
            <p className="text-muted-foreground text-sm uppercase tracking-widest">Brewing Happiness Since 2024</p>
            <div className="pt-8 text-xs text-muted-foreground opacity-50 flex flex-col md:flex-row items-center justify-center gap-4">
              <span>&copy; 2026 Galaxy Grand Cafe. All rights reserved.</span>
              <Link href="/admin" className="hover:text-primary transition-colors hover:underline">Admin Login</Link>
            </div>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}