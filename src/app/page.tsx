"use client"

import { CartProvider } from '@/hooks/use-cart';
import { Navbar } from '@/components/layout/Navbar';
import { MenuGrid } from '@/components/menu/MenuGrid';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

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
              alt="Culinaro Hero" 
              fill 
              priority
              className="object-cover opacity-40 grayscale-[0.5]"
              data-ai-hint="luxury restaurant kitchen"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
          </div>

          <div className="relative z-10 text-center space-y-6 max-w-4xl px-4 mt-20">
            <h1 className="text-6xl md:text-8xl font-headline italic tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-1000">
              The Art of <span className="text-primary">Fine Living</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
              Artisanal recipes crafted with seasonally sourced ingredients, delivered for an immersive gastronomy experience at home.
            </p>
          </div>
        </header>

        {/* Menu Section */}
        <main className="max-w-7xl mx-auto px-4 mt-[-5rem] relative z-20">
          <MenuGrid />
        </main>

        <footer className="py-20 border-t border-border/50 text-center">
          <div className="max-w-7xl mx-auto px-4 space-y-4">
            <h2 className="text-3xl font-headline text-primary">Culinaro</h2>
            <p className="text-muted-foreground text-sm uppercase tracking-widest">Crafting Memories Since 2024</p>
            <div className="pt-8 text-xs text-muted-foreground opacity-50">
              &copy; 2024 Culinaro Gastronomy Group. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}