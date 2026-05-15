"use client"

import { Product, Category } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useState } from 'react';
import { INITIAL_PRODUCTS } from '@/lib/store';

export function MenuGrid() {
  const { addItem } = useCart();
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const filteredProducts = activeCategory === 'All' 
    ? INITIAL_PRODUCTS 
    : INITIAL_PRODUCTS.filter(p => p.category === activeCategory);

  const categories: Category[] = ['All', 'Signature', 'Mains', 'Sides', 'Desserts', 'Spirits'];

  return (
    <div className="space-y-12">
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            className={`rounded-full px-6 h-10 font-bold transition-all ${activeCategory === cat ? 'scale-105' : 'text-muted-foreground'}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Asymmetrical Grid */}
      <div className="asymmetric-grid pb-20">
        {filteredProducts.map((product) => (
          <div 
            key={product.id} 
            className="asymmetric-item group relative overflow-hidden rounded-2xl bg-card border border-border/50 transition-all hover:border-primary/50"
          >
            <div className="absolute inset-0 z-0">
              <Image 
                src={product.imageUrl} 
                alt={product.name} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                data-ai-hint="gourmet dish"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            </div>

            <div className="relative z-10 h-full p-6 flex flex-col justify-end">
              <div className="space-y-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                  {product.category}
                </span>
                <h3 className="text-2xl font-headline leading-tight">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  {product.description}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xl font-bold font-headline">${product.price.toFixed(2)}</span>
                  <Button 
                    size="icon" 
                    className="rounded-full w-10 h-10 shadow-lg scale-0 group-hover:scale-100 transition-transform duration-300"
                    onClick={() => addItem(product)}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}