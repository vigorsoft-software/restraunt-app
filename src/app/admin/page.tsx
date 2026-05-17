
"use client"

import { useState, useEffect } from 'react';
import { INITIAL_PRODUCTS } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AIWriter } from '@/components/admin/AIWriter';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { LayoutDashboard, ShoppingCart, Package, Settings, Plus, Save, Loader2, Database, Trash2, Edit2, List, Users, LogOut, ShieldCheck, CheckCircle, Clock, Utensils, Image as ImageIcon, Key } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, getDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Product, Order, Category, User } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'categories' | 'users'>('inventory');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ mobile: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const firestore = useFirestore();

  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    imageUrl: '',
  });

  const [editingCategory, setEditingCategory] = useState<Partial<Category>>({
    name: '',
    imageUrl: '',
  });

  const [editingUser, setEditingUser] = useState<Partial<User>>({
    mobileNumber: '',
    name: '',
    isAdmin: false,
    password: ''
  });

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const ordersRef = useMemoFirebase(() => firestore ? collection(firestore, 'orders') : null, [firestore]);
  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'categories') : null, [firestore]);
  const usersRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);

  const { data: products, loading: productsLoading } = useCollection<Product>(productsRef);
  const { data: orders, loading: ordersLoading } = useCollection<Order>(ordersRef);
  const { data: categories, loading: categoriesLoading } = useCollection<Category>(categoriesRef);
  const { data: users, loading: usersLoading } = useCollection<User>(usersRef);

  useEffect(() => {
    const adminSession = localStorage.getItem('culinaro_admin_session');
    if (adminSession) setIsAuthenticated(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsLoggingIn(true);

    try {
      const userDoc = await getDoc(doc(firestore, 'users', loginForm.mobile));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        // Plain text password comparison for prototype ease
        if (userData.isAdmin && userData.password === loginForm.password) {
          localStorage.setItem('culinaro_admin_session', loginForm.mobile);
          setIsAuthenticated(true);
          toast({ title: "Login Successful" });
        } else {
          toast({ title: "Invalid admin credentials", variant: "destructive" });
        }
      } else {
        toast({ title: "User not found", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Login failed", variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('culinaro_admin_session');
    setIsAuthenticated(false);
  };

  const handleUpdateOrderStatus = (orderId: string, status: Order['status'], customerMobile: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    
    updateDoc(orderRef, { status }).then(() => {
      toast({ title: `Order marked as ${status}` });
      
      const notificationRef = collection(firestore, 'notifications');
      addDoc(notificationRef, {
        userId: customerMobile,
        title: `Order Update: ${status}`,
        message: `Your culinary selection is now ${status}.`,
        read: false,
        createdAt: serverTimestamp()
      });
    });
  };

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
        setEditingProduct({ name: '', description: '', price: 0, category: '', imageUrl: '' });
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: productRef.path, operation: 'write', requestResourceData: productData }));
      });
  };

  const handleDeleteProduct = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'products', id)).then(() => toast({ title: "Product deleted" }));
  };

  const handleSaveCategory = () => {
    if (!firestore || !editingCategory.name) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }
    const catId = editingCategory.id || Math.random().toString(36).substring(2, 9);
    const catRef = doc(firestore, 'categories', catId);
    
    const categoryData = {
      id: catId,
      name: editingCategory.name,
      imageUrl: editingCategory.imageUrl || `https://picsum.photos/seed/cat-${catId}/400/300`
    } as Category;

    setDoc(catRef, categoryData, { merge: true }).then(() => {
      toast({ title: "Category saved" });
      setEditingCategory({ name: '', imageUrl: '' });
    });
  };

  const handleDeleteCategory = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'categories', id)).then(() => toast({ title: "Category deleted" }));
  };

  const handleSaveUser = () => {
    if (!firestore || !editingUser.mobileNumber || !editingUser.name) {
      toast({ title: "Mobile and Name are required", variant: "destructive" });
      return;
    }
    const userRef = doc(firestore, 'users', editingUser.mobileNumber);
    setDoc(userRef, { 
      ...editingUser,
      mobileNumber: editingUser.mobileNumber,
      isAdmin: !!editingUser.isAdmin,
      password: editingUser.isAdmin ? (editingUser.password || 'admin123') : ''
    }, { merge: true }).then(() => {
      toast({ title: "User saved successfully" });
      setEditingUser({ mobileNumber: '', name: '', isAdmin: false, password: '' });
    });
  };

  const handleSeedDatabase = () => {
    if (!firestore) return;
    
    // Default Admin (Username: admin, Password: admin)
    setDoc(doc(firestore, 'users', 'admin'), {
      mobileNumber: 'admin',
      name: 'Primary Administrator',
      isAdmin: true,
      password: 'admin'
    });

    // Default Mobile Admin (Username: 9999999999, Password: admin)
    setDoc(doc(firestore, 'users', '9999999999'), {
      mobileNumber: '9999999999',
      name: 'System Admin',
      isAdmin: true,
      password: 'admin'
    });

    ['Starters', 'Soups', 'Mains', 'Juice', 'Desserts'].forEach(name => {
      const id = name.toLowerCase();
      setDoc(doc(firestore, 'categories', id), { 
        id, 
        name,
        imageUrl: `https://picsum.photos/seed/cat-${id}/400/300`
      });
    });

    INITIAL_PRODUCTS.forEach(p => setDoc(doc(firestore, 'products', p.id), p));
    toast({ title: "Database seeded. Use admin/admin to login." });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border/50 shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Key className="text-primary w-6 h-6" />
            </div>
            <CardTitle className="text-3xl font-headline italic text-primary">Culinaro Access</CardTitle>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Administrative Portal</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label>Admin Identifier (Mobile/Username)</Label>
                <Input 
                  value={loginForm.mobile} 
                  onChange={e => setLoginForm(p => ({...p, mobile: e.target.value}))}
                  placeholder="admin or mobile number"
                  className="h-12 bg-muted/20 border-border/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input 
                  type="password"
                  value={loginForm.password}
                  onChange={e => setLoginForm(p => ({...p, password: e.target.value}))}
                  placeholder="••••••••"
                  className="h-12 bg-muted/20 border-border/50"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 font-bold text-lg" disabled={isLoggingIn}>
                {isLoggingIn ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>
              <div className="pt-4 border-t border-border/50">
                <Button variant="ghost" type="button" className="w-full text-[10px] opacity-40 hover:opacity-100" onClick={handleSeedDatabase}>
                  Provision Default Admin (admin/admin)
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border/50 bg-card/50 backdrop-blur-xl p-8 flex flex-col gap-10">
        <Link href="/" className="text-3xl font-headline italic text-primary px-2">Culinaro</Link>
        <nav className="flex flex-col gap-3 flex-1">
          <Button variant={activeTab === 'inventory' ? 'secondary' : 'ghost'} className="justify-start gap-4 h-14 rounded-2xl font-bold text-base" onClick={() => setActiveTab('inventory')}><Package className="w-5 h-5" /> Inventory</Button>
          <Button variant={activeTab === 'categories' ? 'secondary' : 'ghost'} className="justify-start gap-4 h-14 rounded-2xl font-bold text-base" onClick={() => setActiveTab('categories')}><List className="w-5 h-5" /> Categories</Button>
          <Button variant={activeTab === 'orders' ? 'secondary' : 'ghost'} className="justify-start gap-4 h-14 rounded-2xl font-bold text-base" onClick={() => setActiveTab('orders')}><ShoppingCart className="w-5 h-5" /> Orders</Button>
          <Button variant={activeTab === 'users' ? 'secondary' : 'ghost'} className="justify-start gap-4 h-14 rounded-2xl font-bold text-base" onClick={() => setActiveTab('users')}><Users className="w-5 h-5" /> User Base</Button>
        </nav>
        <Button variant="ghost" className="justify-start gap-4 h-14 rounded-2xl text-destructive font-bold" onClick={handleLogout}><LogOut className="w-5 h-5" /> Sign Out</Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-headline capitalize">{activeTab}</h1>
              <p className="text-muted-foreground mt-2 uppercase tracking-widest text-xs">Management & Control</p>
            </div>
          </header>

          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1">
                <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl sticky top-12">
                  <CardHeader className="bg-muted/30"><CardTitle className="text-sm uppercase tracking-[0.2em] font-bold text-primary">{editingProduct.id ? 'Refine Dish' : 'Compose Dish'}</CardTitle></CardHeader>
                  <CardContent className="space-y-6 pt-8">
                    <div className="space-y-2"><Label>Dish Name</Label><Input placeholder="e.g. Saffron Risotto" value={editingProduct.name} onChange={e => setEditingProduct(p => ({...p, name: e.target.value}))}/></div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={editingProduct.category} onValueChange={v => setEditingProduct(p => ({...p, category: v}))}>
                        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>{categories?.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <div className="flex gap-2">
                        <Input value={editingProduct.imageUrl} onChange={e => setEditingProduct(p => ({...p, imageUrl: e.target.value}))} placeholder="https://..."/>
                        <Button variant="outline" size="icon" onClick={() => setEditingProduct(p => ({...p, imageUrl: `https://picsum.photos/seed/${Math.random()}/600/600`}))}>
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      {editingProduct.imageUrl && (
                        <div className="mt-2 relative aspect-square rounded-2xl overflow-hidden border border-border/50">
                          <Image src={editingProduct.imageUrl} alt="Preview" fill className="object-cover" />
                        </div>
                      )}
                    </div>
                    <AIWriter onGenerated={desc => setEditingProduct(p => ({...p, description: desc}))} />
                    <div className="space-y-2"><Label>Menu Description</Label><Textarea value={editingProduct.description} onChange={e => setEditingProduct(p => ({...p, description: e.target.value}))}/></div>
                    <div className="space-y-2"><Label>Price (₹)</Label><Input type="number" value={editingProduct.price} onChange={e => setEditingProduct(p => ({...p, price: Number(e.target.value)}))}/></div>
                    <Button className="w-full h-12 gap-2 font-bold rounded-xl" onClick={handleSaveProduct}><Save className="w-4 h-4" /> Save Selection</Button>
                    {editingProduct.id && <Button variant="ghost" className="w-full" onClick={() => setEditingProduct({ name: '', description: '', price: 0, category: '', imageUrl: '' })}>Cancel Edit</Button>}
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
                  {productsLoading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> : (
                    <Table>
                      <TableHeader className="bg-muted/30"><TableRow><TableHead>Dish</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>{products?.map(p => (
                        <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="font-bold">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-border/50 shadow-sm">
                                <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                              </div>
                              {p.name}
                            </div>
                          </TableCell>
                          <TableCell><span className="text-[10px] uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">{p.category}</span></TableCell>
                          <TableCell className="text-right text-primary font-bold">₹{p.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setEditingProduct(p)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive rounded-full" onClick={() => handleDeleteProduct(p.id)}><Trash2 className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}</TableBody>
                    </Table>
                  )}
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1">
                <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
                  <CardHeader className="bg-muted/30"><CardTitle className="text-sm uppercase tracking-widest font-bold">{editingCategory.id ? 'Edit Category' : 'New Category'}</CardTitle></CardHeader>
                  <CardContent className="space-y-6 pt-8">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input placeholder="e.g. Signature Mains" value={editingCategory.name} onChange={e => setEditingCategory(c => ({...c, name: e.target.value}))}/>
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <div className="flex gap-2">
                        <Input value={editingCategory.imageUrl} onChange={e => setEditingCategory(c => ({...c, imageUrl: e.target.value}))} placeholder="https://..."/>
                        <Button variant="outline" size="icon" onClick={() => setEditingCategory(c => ({...c, imageUrl: `https://picsum.photos/seed/cat-${Math.random()}/400/300`}))}>
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      {editingCategory.imageUrl && (
                        <div className="mt-2 relative aspect-video rounded-xl overflow-hidden border border-border/50">
                          <Image src={editingCategory.imageUrl} alt="Category Preview" fill className="object-cover" />
                        </div>
                      )}
                    </div>
                    <Button className="w-full h-12 gap-2 font-bold rounded-xl" onClick={handleSaveCategory}><Save className="w-4 h-4" /> Update Menu</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
                  <Table>
                    <TableHeader className="bg-muted/30"><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>{categories?.map(c => (
                      <TableRow key={c.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="font-bold">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-10 rounded-lg overflow-hidden relative border border-border/50">
                              <Image src={c.imageUrl || 'https://placehold.co/400x300?text=No+Image'} alt={c.name} fill className="object-cover" />
                            </div>
                            {c.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setEditingCategory(c)}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive rounded-full" onClick={() => handleDeleteCategory(c.id)}><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1">
                <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
                  <CardHeader className="bg-muted/30"><CardTitle className="text-sm uppercase tracking-widest font-bold">User Modification</CardTitle></CardHeader>
                  <CardContent className="space-y-6 pt-8">
                    <div className="space-y-2"><Label>Mobile Number (Identifier)</Label><Input value={editingUser.mobileNumber} onChange={e => setEditingUser(u => ({...u, mobileNumber: e.target.value}))} placeholder="9999999999"/></div>
                    <div className="space-y-2"><Label>Full Name</Label><Input value={editingUser.name} onChange={e => setEditingUser(u => ({...u, name: e.target.value}))} placeholder="John Doe"/></div>
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                      <div className="space-y-1">
                        <Label className="font-bold">Admin Privileges</Label>
                        <p className="text-[10px] text-muted-foreground uppercase">Enable dashboard access</p>
                      </div>
                      <input type="checkbox" className="w-5 h-5 accent-primary" checked={editingUser.isAdmin} onChange={e => setEditingUser(u => ({...u, isAdmin: e.target.checked}))} />
                    </div>
                    {editingUser.isAdmin && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>Access Password</Label>
                        <Input type="text" value={editingUser.password} onChange={e => setEditingUser(u => ({...u, password: e.target.value}))} placeholder="Set admin password"/>
                      </div>
                    )}
                    <Button className="w-full h-12 gap-2 font-bold rounded-xl" onClick={handleSaveUser}><Save className="w-4 h-4" /> Finalize User</Button>
                    {editingUser.mobileNumber && <Button variant="ghost" className="w-full" onClick={() => setEditingUser({ mobileNumber: '', name: '', isAdmin: false, password: '' })}>Reset Selection</Button>}
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
                  <Table>
                    <TableHeader className="bg-muted/30"><TableRow><TableHead>Identity</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Activity</TableHead><TableHead className="text-right">Edit</TableHead></TableRow></TableHeader>
                    <TableBody>{users?.map(u => (
                      <TableRow key={u.mobileNumber} className="hover:bg-muted/10 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-bold text-base">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{u.mobileNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.isAdmin ? (
                            <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-tighter bg-primary/5 px-2 py-1 rounded-full border border-primary/20 w-fit">
                              <ShieldCheck className="w-3 h-3"/> Administrator
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-[10px] uppercase font-bold px-2 py-1 bg-muted/50 rounded-full w-fit">Patron</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-[10px] opacity-60">
                          {u.lastOrderedAt ? new Date(u.lastOrderedAt.seconds * 1000).toLocaleDateString() : 'New Entry'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setEditingUser(u)}><Edit2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[150px]">Order Ref</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Valuation</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.map(o => (
                    <TableRow key={o.id} className="hover:bg-muted/5 transition-colors h-20">
                      <TableCell className="font-mono text-[10px] uppercase opacity-50 tracking-widest">#{o.id}</TableCell>
                      <TableCell>
                        <div className="font-bold text-base">{o.customerName}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{o.mobileNumber}</div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-lg">₹{o.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-3 py-1 text-[9px] uppercase font-bold rounded-full border ${
                          o.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                          o.status === 'preparing' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          o.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          'bg-muted text-muted-foreground border-border/50'
                        }`}>
                          {o.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-500/10" onClick={() => handleUpdateOrderStatus(o.id, 'preparing', o.mobileNumber)} title="Prepare">
                            <Utensils className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-green-500/10" onClick={() => handleUpdateOrderStatus(o.id, 'completed', o.mobileNumber)} title="Complete">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted" onClick={() => handleUpdateOrderStatus(o.id, 'delivered', o.mobileNumber)} title="Deliver">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders?.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No gourmet orders currently in queue.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
