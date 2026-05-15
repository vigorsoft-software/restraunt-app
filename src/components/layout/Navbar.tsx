"use client"

import Link from 'next/link';
import { ShoppingBag, Menu, User } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { CartDrawer } from '../cart/CartDrawer';

export function Navbar() {
  const { items } = useCart();
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
          <Link href="/" className="text-2xl font-headline italic text-primary">
            Culinaro
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">Menu</Link>
          <Link href="/#signature" className="text-sm font-medium hover:text-primary transition-colors">Signatures</Link>
          <Link href="/admin" className="text-sm font-medium hover:text-primary transition-colors">Admin</Link>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <User className="w-5 h-5 text-muted-foreground" />
          </Button>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <CartDrawer />
          </Sheet>
        </div>
      </div>
    </nav>
  );
}