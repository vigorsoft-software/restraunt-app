
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
import { useCollection, useFirestore, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, getDoc, updateDoc, serverTimestamp, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Product, Order, Category, User } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'categories' | 'users' | 'settings'>('inventory');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ mobile: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const firestore = useFirestore();

  const [telegramConfig, setTelegramConfig] = useState({ botToken: '', chatId: '', botUsername: '', webhookSecret: '' });
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (firestore && isAuthenticated && activeTab === 'settings') {
      getDoc(doc(firestore, 'settings', 'telegram')).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setTelegramConfig({
            botToken: data.botToken || '',
            chatId: data.chatId || '',
            botUsername: data.botUsername || '',
            webhookSecret: data.webhookSecret || ''
          });
        }
      });
    }
  }, [firestore, isAuthenticated, activeTab]);

  const handleSaveTelegramConfig = async () => {
    if (!firestore) return;
    try {
      await setDoc(doc(firestore, 'settings', 'telegram'), telegramConfig);
      toast({ title: "Telegram configuration saved" });
    } catch (error: any) {
      console.error(error);
      const permissionError = new FirestorePermissionError({
        path: 'settings/telegram',
        operation: 'write',
        requestResourceData: telegramConfig,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };
  const app = useFirebaseApp();
  const storage = useMemoFirebase(() => app ? getStorage(app) : null, [app]);

  const [isUploadingProductImg, setIsUploadingProductImg] = useState(false);
  const [isUploadingCategoryImg, setIsUploadingCategoryImg] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, path: string, setUrl: (url: string) => void, setLoading: (l: boolean) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.success && data.url) {
        setUrl(data.url);
        toast({ title: "Image uploaded successfully" });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
  
  const telegramLogsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'telegram_logs'), orderBy('timestamp', 'desc'), limit(50)) : null, [firestore]);
  const { data: telegramLogs } = useCollection<any>(telegramLogsRef as any);

  useEffect(() => {
    const adminSession = localStorage.getItem('culinaro_admin_session');
    if (adminSession) setIsAuthenticated(true);

    const lockout = localStorage.getItem('admin_lockout_until');
    if (lockout) {
      const lockoutTime = parseInt(lockout, 10);
      if (Date.now() < lockoutTime) {
        setLockoutUntil(lockoutTime);
        setFailedAttempts(3);
      } else {
        localStorage.removeItem('admin_lockout_until');
      }
    }
  }, []);

  const handleFailedLogin = () => {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    if (newAttempts >= 3) {
      const lockoutTime = Date.now() + 5 * 60 * 1000; // 5 minutes
      setLockoutUntil(lockoutTime);
      localStorage.setItem('admin_lockout_until', lockoutTime.toString());
      toast({ title: "Too many failed attempts. Locked out for 5 minutes.", variant: "destructive" });
    } else {
      toast({ title: `Invalid credentials. ${3 - newAttempts} attempts left.`, variant: "destructive" });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    
    if (lockoutUntil && Date.now() < lockoutUntil) {
      toast({ title: `Locked out. Try again in ${Math.ceil((lockoutUntil - Date.now()) / 60000)}m.`, variant: "destructive" });
      return;
    }

    setIsLoggingIn(true);

    try {
      const userDoc = await getDoc(doc(firestore, 'users', loginForm.mobile));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        // Plain text password comparison for prototype ease
        if (userData.isAdmin && userData.password === loginForm.password) {
          localStorage.setItem('culinaro_admin_session', loginForm.mobile);
          setIsAuthenticated(true);
          setFailedAttempts(0);
          setLockoutUntil(null);
          localStorage.removeItem('admin_lockout_until');
          toast({ title: "Login Successful" });
        } else {
          handleFailedLogin();
        }
      } else {
        handleFailedLogin();
      }
    } catch (err) {
      handleFailedLogin();
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('culinaro_admin_session');
    setIsAuthenticated(false);
  };

  const handleRetryTelegram = async (log: any) => {
    if (!firestore) return;
    setIsRetrying(true);
    try {
      const orderDoc = await getDoc(doc(firestore, 'orders', log.orderId));
      if (!orderDoc.exists()) {
        toast({ title: "Order not found", variant: "destructive" });
        return;
      }
      const order = orderDoc.data() as Order;
      
      let config = telegramConfig;
      if (!config.botToken || !config.chatId) {
        config = {
          botToken: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '',
          chatId: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || ''
        };
      }
      
      if (!config.botToken || !config.chatId) {
        toast({ title: "Telegram config missing", variant: "destructive" });
        return;
      }
      
      const itemsList = order.items.map(i => `${i.quantity}x ${i.name}`).join('\n');
      const text = `New Order Received! (RETRY)\n\nCustomer: ${order.customerName}\nMobile: ${order.mobileNumber}\nTotal: ₹${order.totalAmount.toFixed(2)}\n\nItems:\n${itemsList}`;
      
      const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: text
        })
      });
      const responseStatus = res.status;
      const responseBody = await res.text();
      
      await addDoc(collection(firestore, 'telegram_logs'), {
        orderId: log.orderId,
        chatId: config.chatId,
        status: responseStatus,
        response: responseBody,
        timestamp: serverTimestamp(),
        isRetry: true
      });
      
      toast({ title: responseStatus === 200 ? "Retried successfully!" : "Retry failed", variant: responseStatus === 200 ? "default" : "destructive" });
    } catch (e) {
      toast({ title: "Error retrying", variant: "destructive" });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status'], customerMobile: string) => {
    try {
      const response = await fetch('/api/admin/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast({ title: `Order marked as ${status}` });
      
      if (firestore) {
        const notificationRef = collection(firestore, 'notifications');
        addDoc(notificationRef, {
          userId: customerMobile,
          title: `Order Update: ${status}`,
          message: `Your culinary selection is now ${status}.`,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      toast({ title: "Error updating order", variant: "destructive" });
    }
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


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border/50 shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Key className="text-primary w-6 h-6" />
            </div>
            <CardTitle className="text-3xl font-headline italic text-primary">Galaxy Grand Cafe Access</CardTitle>
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
              <Button type="submit" className="w-full h-12 font-bold text-lg" disabled={isLoggingIn || (lockoutUntil !== null && Date.now() < lockoutUntil)}>
                {isLoggingIn ? <Loader2 className="animate-spin" /> : (lockoutUntil && Date.now() < lockoutUntil ? `Locked (Wait ${Math.ceil((lockoutUntil - Date.now()) / 60000)}m)` : 'Sign In')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 md:h-screen md:sticky md:top-0 border-b md:border-b-0 md:border-r border-border/50 bg-card/50 backdrop-blur-xl p-4 md:p-8 flex flex-col gap-4 md:gap-10 z-30">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl md:text-3xl font-headline italic text-primary px-2">Galaxy Grand Cafe</Link>
          <Button variant="ghost" size="icon" className="md:hidden text-destructive" onClick={handleLogout}><LogOut className="w-5 h-5" /></Button>
        </div>
        <nav className="flex flex-row md:flex-col gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <Button variant={activeTab === 'inventory' ? 'secondary' : 'ghost'} className="whitespace-nowrap justify-start gap-2 md:gap-4 h-10 md:h-14 rounded-xl md:rounded-2xl font-bold text-sm md:text-base" onClick={() => setActiveTab('inventory')}><Package className="w-4 h-4 md:w-5 md:h-5" /> Inventory</Button>
          <Button variant={activeTab === 'categories' ? 'secondary' : 'ghost'} className="whitespace-nowrap justify-start gap-2 md:gap-4 h-10 md:h-14 rounded-xl md:rounded-2xl font-bold text-sm md:text-base" onClick={() => setActiveTab('categories')}><List className="w-4 h-4 md:w-5 md:h-5" /> Categories</Button>
          <Button variant={activeTab === 'orders' ? 'secondary' : 'ghost'} className="whitespace-nowrap justify-start gap-2 md:gap-4 h-10 md:h-14 rounded-xl md:rounded-2xl font-bold text-sm md:text-base" onClick={() => setActiveTab('orders')}><ShoppingCart className="w-4 h-4 md:w-5 md:h-5" /> Orders</Button>
          <Button variant={activeTab === 'users' ? 'secondary' : 'ghost'} className="whitespace-nowrap justify-start gap-2 md:gap-4 h-10 md:h-14 rounded-xl md:rounded-2xl font-bold text-sm md:text-base" onClick={() => setActiveTab('users')}><Users className="w-4 h-4 md:w-5 md:h-5" /> User Base</Button>
          <Button variant={activeTab === 'settings' ? 'secondary' : 'ghost'} className="whitespace-nowrap justify-start gap-2 md:gap-4 h-10 md:h-14 rounded-xl md:rounded-2xl font-bold text-sm md:text-base" onClick={() => setActiveTab('settings')}><Settings className="w-4 h-4 md:w-5 md:h-5" /> Settings</Button>
        </nav>
        <div className="hidden md:flex mt-auto">
          <Button variant="ghost" className="w-full justify-start gap-4 h-14 rounded-2xl text-destructive font-bold" onClick={handleLogout}><LogOut className="w-5 h-5" /> Sign Out</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-12 overflow-auto w-full">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-12">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-5xl font-headline capitalize">{activeTab}</h1>
              <p className="text-muted-foreground mt-1 md:mt-2 uppercase tracking-widest text-[10px] md:text-xs">Management & Control</p>
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
                      <Label>Dish Image</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="file" 
                          accept="image/*"
                          onChange={e => handleImageUpload(e, 'products', url => setEditingProduct(p => ({...p, imageUrl: url})), setIsUploadingProductImg)}
                          className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        <Button variant="outline" size="icon" onClick={() => setEditingProduct(p => ({...p, imageUrl: `https://picsum.photos/seed/${Math.random()}/600/600`}))} title="Generate random image">
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      {isUploadingProductImg && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Uploading image...</div>}
                      {editingProduct.imageUrl && !isUploadingProductImg && (
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
                      <Label>Category Image</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="file" 
                          accept="image/*"
                          onChange={e => handleImageUpload(e, 'categories', url => setEditingCategory(c => ({...c, imageUrl: url})), setIsUploadingCategoryImg)}
                          className="file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        <Button variant="outline" size="icon" onClick={() => setEditingCategory(c => ({...c, imageUrl: `https://picsum.photos/seed/cat-${Math.random()}/400/300`}))} title="Generate random image">
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      {isUploadingCategoryImg && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Uploading image...</div>}
                      {editingCategory.imageUrl && !isUploadingCategoryImg && (
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

          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-sm uppercase tracking-widest font-bold">Telegram Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                  <p className="text-sm text-muted-foreground">Configure a Telegram Bot to receive real-time order notifications.</p>
                  <div className="space-y-2">
                    <Label>Bot Token (for sending updates)</Label>
                    <Input 
                      placeholder="e.g. 123456789:ABCdefGHIjklMNO..." 
                      value={telegramConfig.botToken} 
                      onChange={e => setTelegramConfig(p => ({...p, botToken: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Admin Chat ID (for new order notifications)</Label>
                    <Input 
                      placeholder="e.g. -1001234567890" 
                      value={telegramConfig.chatId} 
                      onChange={e => setTelegramConfig(p => ({...p, chatId: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bot Username (for generating tracking links)</Label>
                    <Input 
                      placeholder="e.g. GalaxyGrandCafeBot" 
                      value={telegramConfig.botUsername} 
                      onChange={e => setTelegramConfig(p => ({...p, botUsername: e.target.value}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook Secret (for verifying requests)</Label>
                    <Input 
                      type="password"
                      placeholder="Your secret string" 
                      value={telegramConfig.webhookSecret} 
                      onChange={e => setTelegramConfig(p => ({...p, webhookSecret: e.target.value}))}
                    />
                  </div>
                  <Button className="h-12 gap-2 font-bold rounded-xl" onClick={handleSaveTelegramConfig}>
                    <Save className="w-4 h-4" /> Save Configuration
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 rounded-3xl overflow-hidden shadow-xl mt-8">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-sm uppercase tracking-widest font-bold">Notification History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30"><TableRow><TableHead>Order</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {telegramLogs?.map((log: any) => (
                        <TableRow key={log.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="font-mono text-xs opacity-70">#{log.orderId}</TableCell>
                          <TableCell className="text-xs">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}</TableCell>
                          <TableCell>
                            {log.status === 200 ? (
                              <span className="text-green-500 text-xs font-bold px-2 py-1 bg-green-500/10 rounded-full">Success</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="text-destructive text-xs font-bold px-2 py-1 bg-destructive/10 rounded-full w-fit">Failed</span>
                                <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[200px]" title={log.response || log.error}>{log.response || log.error}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleRetryTelegram(log)} disabled={isRetrying}>Retry</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!telegramLogs || telegramLogs.length === 0) && (
                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic text-xs">No logs found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
