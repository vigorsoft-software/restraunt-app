
"use client"

import { useState, useMemo } from 'react';
import { INITIAL_PRODUCTS } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AIWriter } from '@/components/admin/AIWriter';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { LayoutDashboard, ShoppingCart, Package, Settings, Plus, Save, Loader2, Database } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Category, Product, Order } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');
  const firestore = useFirestore();
  
  const [editingProduct, setEditingProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Mains' as Category,
  });

  const productsRef = useMemo(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const ordersRef = useMemo(() => firestore ? collection(firestore, 'orders') : null, [firestore]);

  const { data: products, loading: productsLoading } = useCollection<Product>(productsRef);
  const { data: orders, loading: ordersLoading } = useCollection<Order>(ordersRef);

  const handleSaveProduct = () => {
    if (!firestore || !editingProduct.name || !editingProduct.price) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    const productId = Math.random().toString(36).substring(2, 9);
    const productRef = doc(firestore, 'products', productId);
    
    const productData = {
      id: productId,
      name: editingProduct.name,
      description: editingProduct.description,
      price: parseFloat(editingProduct.price),
      category: editingProduct.category,
      imageUrl: 'https://picsum.photos/seed/' + productId + '/600/600',
      ingredients: []
    };

    setDoc(productRef, productData)
      .then(() => {
        toast({ title: "Product added to menu" });
        setEditingProduct({ name: '', description: '', price: '', category: 'Mains' });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: productRef.path,
          operation: 'create',
          requestResourceData: productData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleSeedDatabase = () => {
    if (!firestore) return;
    INITIAL_PRODUCTS.forEach(p => {
      const pRef = doc(firestore, 'products', p.id);
      setDoc(pRef, p);
    });
    toast({ title: "Database seeded with initial menu" });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border/50 bg-card p-6 flex flex-col gap-8">
        <Link href="/" className="text-2xl font-headline italic text-primary">Culinaro</Link>
        <nav className="flex flex-col gap-2">
          <Button 
            variant={activeTab === 'inventory' ? 'secondary' : 'ghost'} 
            className="justify-start gap-3 h-12 rounded-xl font-bold"
            onClick={() => setActiveTab('inventory')}
          >
            <Package className="w-5 h-5" /> Inventory
          </Button>
          <Button 
            variant={activeTab === 'orders' ? 'secondary' : 'ghost'} 
            className="justify-start gap-3 h-12 rounded-xl font-bold"
            onClick={() => setActiveTab('orders')}
          >
            <ShoppingCart className="w-5 h-5" /> Orders
          </Button>
          <Button variant="ghost" className="justify-start gap-3 h-12 rounded-xl font-bold">
            <LayoutDashboard className="w-5 h-5" /> Analytics
          </Button>
          <Button variant="ghost" className="justify-start gap-3 h-12 rounded-xl font-bold">
            <Settings className="w-5 h-5" /> Store Settings
          </Button>
        </nav>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-headline">
              {activeTab === 'inventory' ? 'Inventory Console' : 'Order Flow'}
            </h1>
            <div className="flex gap-4">
              <Button variant="outline" className="gap-2 font-bold rounded-full" onClick={handleSeedDatabase}>
                <Database className="w-5 h-5" /> Seed Data
              </Button>
              {activeTab === 'inventory' && (
                <Button className="gap-2 font-bold rounded-full">
                  <Plus className="w-5 h-5" /> New Product
                </Button>
              )}
            </div>
          </div>

          {activeTab === 'inventory' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <Card className="bg-card border-border/50 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg uppercase tracking-widest text-muted-foreground">Quick Add</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold">Dish Name</Label>
                      <Input 
                        placeholder="Dish Name" 
                        value={editingProduct.name}
                        onChange={e => setEditingProduct(p => ({...p, name: e.target.value}))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold">Category</Label>
                      <Select 
                        value={editingProduct.category} 
                        onValueChange={(v: Category) => setEditingProduct(p => ({...p, category: v}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Starters">Starters</SelectItem>
                          <SelectItem value="Soups">Soups</SelectItem>
                          <SelectItem value="Mains">Mains</SelectItem>
                          <SelectItem value="Juice">Juice</SelectItem>
                          <SelectItem value="Desserts">Desserts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <AIWriter 
                      onGenerated={(desc) => setEditingProduct(p => ({...p, description: desc}))} 
                    />

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold">Menu Description</Label>
                      <Textarea 
                        placeholder="Description..." 
                        rows={4}
                        value={editingProduct.description}
                        onChange={e => setEditingProduct(p => ({...p, description: e.target.value}))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-bold">Price ($)</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={editingProduct.price}
                          onChange={e => setEditingProduct(p => ({...p, price: e.target.value}))}
                        />
                      </div>
                      <div className="space-y-2 flex items-end">
                        <Button className="w-full gap-2 font-bold" onClick={handleSaveProduct}>
                          <Save className="w-4 h-4" /> Save
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
                  {productsLoading ? (
                    <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="font-bold">Product</TableHead>
                          <TableHead className="font-bold">Category</TableHead>
                          <TableHead className="font-bold text-right">Price</TableHead>
                          <TableHead className="font-bold text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products?.map(p => (
                          <TableRow key={p.id} className="cursor-pointer hover:bg-muted/10">
                            <TableCell className="font-bold">{p.name}</TableCell>
                            <TableCell className="text-muted-foreground">{p.category}</TableCell>
                            <TableCell className="text-right font-headline text-primary font-bold">${p.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] uppercase font-bold rounded">Active</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              </div>
            </div>
          ) : (
            <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
              {ordersLoading ? (
                <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold">Order ID</TableHead>
                      <TableHead className="font-bold">Customer</TableHead>
                      <TableHead className="font-bold text-right">Amount</TableHead>
                      <TableHead className="font-bold text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!orders || orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">
                          No orders received today.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map(o => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">#{o.id.toUpperCase()}</TableCell>
                          <TableCell className="font-bold">{o.customerName}</TableCell>
                          <TableCell className="text-right font-bold text-primary">${o.totalAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <span className="px-2 py-1 bg-primary/20 text-primary text-[10px] uppercase font-bold rounded">
                              {o.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
