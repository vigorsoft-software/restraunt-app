
"use client"

import { Product, Category } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export function MenuGrid() {
  const { addItem } = useCart();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const firestore = useFirestore();

  const productsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);

  const categoriesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'categories');
  }, [firestore]);

  const { data: products, loading: productsLoading } = useCollection<Product>(productsRef);
  const { data: categories, loading: categoriesLoading } = useCollection<Category>(categoriesRef);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return activeCategory === 'All' 
      ? products 
      : products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  if (productsLoading || categoriesLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
        <Button
          variant={activeCategory === 'All' ? 'default' : 'outline'}
          className={`rounded-full px-6 h-10 font-bold transition-all ${activeCategory === 'All' ? 'scale-105' : 'text-muted-foreground'}`}
          onClick={() => setActiveCategory('All')}
        >
          All
        </Button>
        {categories?.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.name ? 'default' : 'outline'}
            className={`rounded-full px-6 h-10 font-bold transition-all ${activeCategory === cat.name ? 'scale-105' : 'text-muted-foreground'}`}
            onClick={() => setActiveCategory(cat.name)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      <div className="asymmetric-grid pb-20">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-20 text-muted-foreground italic">
            No delicacies found in this category.
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="asymmetric-item group relative overflow-hidden rounded-2xl bg-card border border-border/50 transition-all hover:border-primary/50"
            >
              <div className="absolute inset-0 z-0">
                <Image 
                  src={product.imageUrl || 'https://picsum.photos/seed/food/600/600'} 
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
                    <span className="text-xl font-bold font-headline">₹{product.price.toFixed(2)}</span>
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
          ))
        )}
      </div>
    </div>
  );
}
