
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
import { LayoutDashboard, ShoppingCart, Package, Settings, Plus, Save, Loader2, Database, Trash2, Edit2, List, Users, LogOut, ShieldCheck, CheckCircle, Clock, Utensils } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, getDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Product, Order, Category, User } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

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
  });

  const [editingCategory, setEditingCategory] = useState<Partial<Category>>({
    name: '',
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
      
      // Notify customer
      const notificationRef = collection(firestore, 'notifications');
      addDoc(notificationRef, {
        userId: customerMobile,
        title: `Order #${orderId} Update`,
        message: `Your order status has been updated to: ${status.toUpperCase()}`,
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
        setEditingProduct({ name: '', description: '', price: 0, category: '' });
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
    if (!firestore || !editingCategory.name) return;
    const catId = editingCategory.id || Math.random().toString(36).substring(2, 9);
    const catRef = doc(firestore, 'categories', catId);
    setDoc(catRef, { id: catId, name: editingCategory.name }, { merge: true }).then(() => {
      toast({ title: "Category saved" });
      setEditingCategory({ name: '' });
    });
  };

  const handleSaveUser = () => {
    if (!firestore || !editingUser.mobileNumber || !editingUser.name) return;
    const userRef = doc(firestore, 'users', editingUser.mobileNumber);
    setDoc(userRef, { ...editingUser }, { merge: true }).then(() => {
      toast({ title: "User updated" });
      setEditingUser({ mobileNumber: '', name: '', isAdmin: false, password: '' });
    });
  };

  const handleSeedDatabase = () => {
    if (!firestore) return;
    
    // Seed Admin
    setDoc(doc(firestore, 'users', 'admin'), {
      mobileNumber: 'admin',
      name: 'Super Admin',
      isAdmin: true,
      password: 'admin'
    });

    // Seed Categories
    ['Starters', 'Soups', 'Mains', 'Juice', 'Desserts'].forEach(name => {
      const id = name.toLowerCase();
      setDoc(doc(firestore, 'categories', id), { id, name });
    });

    INITIAL_PRODUCTS.forEach(p => setDoc(doc(firestore, 'products', p.id), p));
    toast({ title: "Database seeded (Admin: admin/admin)" });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline italic text-primary">Culinaro Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label>Admin Username (Mobile)</Label>
                <Input 
                  value={loginForm.mobile} 
                  onChange={e => setLoginForm(p => ({...p, mobile: e.target.value}))}
                  placeholder="admin"
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
                  required
                />
              </div>
              <Button type="submit" className="w-full font-bold" disabled={isLoggingIn}>
                {isLoggingIn ? <Loader2 className="animate-spin" /> : 'Enter Dashboard'}
              </Button>
              <Button variant="ghost" type="button" className="w-full text-xs opacity-50" onClick={handleSeedDatabase}>
                Seed Default Admin (admin/admin)
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border/50 bg-card p-6 flex flex-col gap-8">
        <Link href="/" className="text-2xl font-headline italic text-primary">Culinaro</Link>
        <nav className="flex flex-col gap-2 flex-1">
          <Button variant={activeTab === 'inventory' ? 'secondary' : 'ghost'} className="justify-start gap-3 h-12 rounded-xl font-bold" onClick={() => setActiveTab('inventory')}><Package className="w-5 h-5" /> Inventory</Button>
          <Button variant={activeTab === 'categories' ? 'secondary' : 'ghost'} className="justify-start gap-3 h-12 rounded-xl font-bold" onClick={() => setActiveTab('categories')}><List className="w-5 h-5" /> Categories</Button>
          <Button variant={activeTab === 'orders' ? 'secondary' : 'ghost'} className="justify-start gap-3 h-12 rounded-xl font-bold" onClick={() => setActiveTab('orders')}><ShoppingCart className="w-5 h-5" /> Orders</Button>
          <Button variant={activeTab === 'users' ? 'secondary' : 'ghost'} className="justify-start gap-3 h-12 rounded-xl font-bold" onClick={() => setActiveTab('users')}><Users className="w-5 h-5" /> Users</Button>
        </nav>
        <Button variant="ghost" className="justify-start gap-3 text-destructive" onClick={handleLogout}><LogOut className="w-5 h-5" /> Logout</Button>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-headline capitalize">{activeTab}</h1>
          </div>

          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <Card className="bg-card border-border/50 rounded-2xl">
                  <CardHeader><CardTitle className="text-lg uppercase tracking-widest text-muted-foreground">{editingProduct.id ? 'Edit Product' : 'Add Dish'}</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2"><Label>Dish Name</Label><Input value={editingProduct.name} onChange={e => setEditingProduct(p => ({...p, name: e.target.value}))}/></div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={editingProduct.category} onValueChange={v => setEditingProduct(p => ({...p, category: v}))}>
                        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>{categories?.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <AIWriter onGenerated={desc => setEditingProduct(p => ({...p, description: desc}))} />
                    <div className="space-y-2"><Label>Menu Description</Label><Textarea value={editingProduct.description} onChange={e => setEditingProduct(p => ({...p, description: e.target.value}))}/></div>
                    <div className="space-y-2"><Label>Price (₹)</Label><Input type="number" value={editingProduct.price} onChange={e => setEditingProduct(p => ({...p, price: Number(e.target.value)}))}/></div>
                    <Button className="w-full gap-2 font-bold" onClick={handleSaveProduct}><Save className="w-4 h-4" /> Save</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
                  {productsLoading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div> : (
                    <Table>
                      <TableHeader className="bg-muted/30"><TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>{products?.map(p => (
                        <TableRow key={p.id}><TableCell className="font-bold">{p.name}</TableCell><TableCell>{p.category}</TableCell><TableCell className="text-right text-primary font-bold">₹{p.price.toFixed(2)}</TableCell><TableCell className="text-right space-x-2"><Button variant="ghost" size="icon" onClick={() => setEditingProduct(p)}><Edit2 className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteProduct(p.id)}><Trash2 className="w-4 h-4" /></Button></TableCell></TableRow>
                      ))}</TableBody>
                    </Table>
                  )}
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1"><Card className="bg-card border-border/50 rounded-2xl"><CardHeader><CardTitle>Category Editor</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <Input placeholder="Category Name" value={editingCategory.name} onChange={e => setEditingCategory(c => ({...c, name: e.target.value}))}/>
                  <Button className="w-full gap-2 font-bold" onClick={handleSaveCategory}><Save className="w-4 h-4" /> Save Category</Button>
                </CardContent></Card></div>
              <div className="lg:col-span-2"><Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
                <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>{categories?.map(c => (
                    <TableRow key={c.id}><TableCell className="font-bold">{c.name}</TableCell><TableCell className="text-right space-x-2"><Button variant="ghost" size="icon" onClick={() => setEditingCategory(c)}><Edit2 className="w-4 h-4" /></Button></TableCell></TableRow>
                  ))}</TableBody></Table></Card></div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1"><Card className="bg-card border-border/50 rounded-2xl"><CardHeader><CardTitle>User Details</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"><Label>Mobile Number</Label><Input value={editingUser.mobileNumber} onChange={e => setEditingUser(u => ({...u, mobileNumber: e.target.value}))}/></div>
                  <div className="space-y-2"><Label>Full Name</Label><Input value={editingUser.name} onChange={e => setEditingUser(u => ({...u, name: e.target.value}))}/></div>
                  <div className="flex items-center gap-2"><Label>Admin Status</Label><input type="checkbox" checked={editingUser.isAdmin} onChange={e => setEditingUser(u => ({...u, isAdmin: e.target.checked}))} /></div>
                  {editingUser.isAdmin && <div className="space-y-2"><Label>Admin Password</Label><Input type="password" value={editingUser.password} onChange={e => setEditingUser(u => ({...u, password: e.target.value}))}/></div>}
                  <Button className="w-full gap-2 font-bold" onClick={handleSaveUser}><Save className="w-4 h-4" /> Save User</Button>
                </CardContent></Card></div>
              <div className="lg:col-span-2"><Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
                <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Last Activity</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>{users?.map(u => (
                    <TableRow key={u.mobileNumber}><TableCell><div><p className="font-bold">{u.name}</p><p className="text-xs text-muted-foreground">{u.mobileNumber}</p></div></TableCell><TableCell>{u.isAdmin ? <span className="flex items-center gap-1 text-primary text-xs font-bold"><ShieldCheck className="w-3 h-3"/> Admin</span> : <span className="text-muted-foreground text-xs">Customer</span>}</TableCell><TableCell className="text-right text-xs opacity-60">{u.lastOrderedAt ? new Date(u.lastOrderedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setEditingUser(u)}><Edit2 className="w-4 h-4" /></Button></TableCell></TableRow>
                  ))}</TableBody></Table></Card></div>
            </div>
          )}

          {activeTab === 'orders' && (
            <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
              <Table><TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Status</TableHead><TableHead className="text-right">Manage</TableHead></TableRow></TableHeader>
                <TableBody>{orders?.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">#{o.id}</TableCell>
                    <TableCell>
                      <div className="font-bold">{o.customerName}</div>
                      <div className="text-[10px] text-muted-foreground">{o.mobileNumber}</div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">₹{o.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${
                        o.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        o.status === 'preparing' ? 'bg-blue-500/20 text-blue-500' :
                        o.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {o.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleUpdateOrderStatus(o.id, 'preparing', o.mobileNumber)} title="Mark Preparing">
                        <Utensils className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleUpdateOrderStatus(o.id, 'completed', o.mobileNumber)} title="Mark Completed">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleUpdateOrderStatus(o.id, 'delivered', o.mobileNumber)} title="Mark Delivered">
                        <Package className="w-4 h-4 text-gray-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}</TableBody></Table></Card>
          )}
        </div>
      </main>
    </div>
  );
}
