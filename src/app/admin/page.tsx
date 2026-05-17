
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
import { LayoutDashboard, ShoppingCart, Package, Settings, Plus, Save, Loader2, Database, Trash2, Edit2, List } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Product, Order, Category } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'categories'>('inventory');
  const firestore = useFirestore();
  
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
  });

  const [editingCategory, setEditingCategory] = useState<Partial<Category>>({
    name: '',
  });

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const ordersRef = useMemoFirebase(() => firestore ? collection(firestore, 'orders') : null, [firestore]);
  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'categories') : null, [firestore]);

  const { data: products, loading: productsLoading } = useCollection<Product>(productsRef);
  const { data: orders, loading: ordersLoading } = useCollection<Order>(ordersRef);
  const { data: categories, loading: categoriesLoading } = useCollection<Category>(categoriesRef);

  const handleSaveProduct = () => {
    if (!firestore || !editingProduct.name || !editingProduct.price || !editingProduct.category) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    const productId = editingProduct.id || Math.random().toString(36).substring(2, 9);
    const productRef = doc(firestore, 'products', productId);
    
    const productData = {
      ...editingProduct,
      id: productId,
      price: Number(editingProduct.price),
      imageUrl: editingProduct.imageUrl || `https://picsum.photos/seed/${productId}/600/600`,
      ingredients: editingProduct.ingredients || []
    } as Product;

    setDoc(productRef, productData, { merge: true })
      .then(() => {
        toast({ title: editingProduct.id ? "Product updated" : "Product added" });
        setEditingProduct({ name: '', description: '', price: 0, category: '' });
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: productRef.path,
          operation: 'write',
          requestResourceData: productData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleDeleteProduct = (id: string) => {
    if (!firestore) return;
    const productRef = doc(firestore, 'products', id);
    deleteDoc(productRef)
      .then(() => toast({ title: "Product deleted" }))
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: productRef.path, operation: 'delete' }));
      });
  };

  const handleSaveCategory = () => {
    if (!firestore || !editingCategory.name) return;
    const catId = editingCategory.id || Math.random().toString(36).substring(2, 9);
    const catRef = doc(firestore, 'categories', catId);
    const catData = { id: catId, name: editingCategory.name };
    
    setDoc(catRef, catData, { merge: true })
      .then(() => {
        toast({ title: "Category saved" });
        setEditingCategory({ name: '' });
      });
  };

  const handleDeleteCategory = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'categories', id));
  };

  const handleSeedDatabase = () => {
    if (!firestore) return;
    
    // Seed Categories first
    const defaultCats = ['Starters', 'Soups', 'Mains', 'Juice', 'Desserts'];
    defaultCats.forEach(name => {
      const id = name.toLowerCase();
      setDoc(doc(firestore, 'categories', id), { id, name });
    });

    INITIAL_PRODUCTS.forEach(p => {
      const pRef = doc(firestore, 'products', p.id);
      setDoc(pRef, p);
    });
    toast({ title: "Database seeded with initial menu and categories" });
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
            variant={activeTab === 'categories' ? 'secondary' : 'ghost'} 
            className="justify-start gap-3 h-12 rounded-xl font-bold"
            onClick={() => setActiveTab('categories')}
          >
            <List className="w-5 h-5" /> Categories
          </Button>
          <Button 
            variant={activeTab === 'orders' ? 'secondary' : 'ghost'} 
            className="justify-start gap-3 h-12 rounded-xl font-bold"
            onClick={() => setActiveTab('orders')}
          >
            <ShoppingCart className="w-5 h-5" /> Orders
          </Button>
        </nav>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-headline">
              {activeTab === 'inventory' ? 'Inventory' : activeTab === 'categories' ? 'Categories' : 'Order Flow'}
            </h1>
            <div className="flex gap-4">
              <Button variant="outline" className="gap-2 font-bold rounded-full" onClick={handleSeedDatabase}>
                <Database className="w-5 h-5" /> Seed Data
              </Button>
            </div>
          </div>

          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <Card className="bg-card border-border/50 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg uppercase tracking-widest text-muted-foreground">
                      {editingProduct.id ? 'Edit Product' : 'Quick Add'}
                    </CardTitle>
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
                        onValueChange={(v) => setEditingProduct(p => ({...p, category: v}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map(cat => (
                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                          ))}
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
                        <Label className="text-xs uppercase tracking-wider font-bold">Price (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={editingProduct.price}
                          onChange={e => setEditingProduct(p => ({...p, price: Number(e.target.value)}))}
                        />
                      </div>
                      <div className="space-y-2 flex flex-col gap-2">
                        <Button className="w-full gap-2 font-bold" onClick={handleSaveProduct}>
                          <Save className="w-4 h-4" /> Save
                        </Button>
                        {editingProduct.id && (
                           <Button variant="ghost" className="w-full text-xs" onClick={() => setEditingProduct({ name: '', description: '', price: 0, category: '' })}>
                             Cancel Edit
                           </Button>
                        )}
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
                          <TableHead className="font-bold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products?.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-bold">{p.name}</TableCell>
                            <TableCell className="text-muted-foreground">{p.category}</TableCell>
                            <TableCell className="text-right font-headline text-primary font-bold">₹{p.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button variant="ghost" size="icon" onClick={() => setEditingProduct(p)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteProduct(p.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <Card className="bg-card border-border/50 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg uppercase tracking-widest text-muted-foreground">Category Editor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold">Category Name</Label>
                      <Input 
                        placeholder="e.g. Beverages" 
                        value={editingCategory.name}
                        onChange={e => setEditingCategory(c => ({...c, name: e.target.value}))}
                      />
                    </div>
                    <Button className="w-full gap-2 font-bold" onClick={handleSaveCategory}>
                      <Save className="w-4 h-4" /> Save Category
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-bold">Name</TableHead>
                        <TableHead className="font-bold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories?.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-bold">{c.name}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => setEditingCategory(c)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteCategory(c.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
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
                          <TableCell className="text-right font-bold text-primary">₹{o.totalAmount.toFixed(2)}</TableCell>
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
