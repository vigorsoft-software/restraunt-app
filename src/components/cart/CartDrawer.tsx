
"use client"

import { useCart } from '@/hooks/use-cart';
import { SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Minus, Plus, Trash2, X, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { CheckoutForm } from '../checkout/CheckoutForm';

export function CartDrawer() {
  const { items, total, updateQuantity, removeItem } = useCart();
  const [isCheckout, setIsCheckout] = useState(false);

  if (isCheckout) {
    return (
      <SheetContent className="w-full sm:max-w-md bg-card border-l border-border/50">
        <SheetHeader className="mb-6 flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="font-headline text-2xl">Finalize Order</SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsCheckout(false)}>
            <X className="w-5 h-5" />
          </Button>
        </SheetHeader>
        <CheckoutForm onBack={() => setIsCheckout(false)} />
      </SheetContent>
    );
  }

  return (
    <SheetContent className="w-full sm:max-w-md bg-card border-l border-border/50 flex flex-col">
      <SheetHeader className="mb-6">
        <SheetTitle className="font-headline text-3xl">Your Selection</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-hidden">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <ShoppingBag className="w-12 h-12 opacity-20" />
            <p>No dishes selected yet.</p>
          </div>
        ) : (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <Image 
                      src={item.imageUrl} 
                      alt={item.name} 
                      fill 
                      className="object-cover"
                      data-ai-hint="food item"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-headline text-lg truncate">{item.name}</h4>
                    <p className="text-primary font-bold">INR {item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-border rounded-full p-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <SheetFooter className="mt-auto border-t border-border/50 pt-6">
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Subtotal</span>
            <span className="text-primary">INR {total.toFixed(2)}</span>
          </div>
          <Button 
            className="w-full h-12 text-lg font-bold" 
            disabled={items.length === 0}
            onClick={() => setIsCheckout(true)}
          >
            Checkout with COD
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Cash on delivery is our exclusive payment method.
          </p>
        </div>
      </SheetFooter>
    </SheetContent>
  );
}
