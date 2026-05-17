"use client"

import { useState, useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function CheckoutForm({ onBack }: { onBack: () => void }) {
  const { items, total, clearCart } = useCart();
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string>(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'GalaxyGrandCafeBot');
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    allowNotifications: true
  });

  useEffect(() => {
    if (!firestore) return;
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(firestore, 'settings', 'telegram'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.botUsername) setBotUsername(data.botUsername);
        }
      } catch (e) {
        console.error('Failed to fetch telegram config', e);
      }
    };
    fetchConfig();
  }, [firestore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    
    if (!formData.name || !formData.mobile) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (formData.allowNotifications && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    setLoading(true);
    
    const orderId = Math.random().toString(36).substr(2, 9);
    const orderRef = doc(firestore, 'orders', orderId);
    const userRef = doc(firestore, 'users', formData.mobile);
    
    const orderData = {
      id: orderId,
      customerName: formData.name,
      mobileNumber: formData.mobile,
      items: items,
      totalAmount: total,
      status: 'pending' as const,
      createdAt: serverTimestamp()
    };

    const userData = {
      mobileNumber: formData.mobile,
      name: formData.name,
      isAdmin: false,
      lastOrderedAt: serverTimestamp()
    };

    // Notification for admins
    const adminNotificationRef = collection(firestore, 'notifications');
    const adminNotificationData = {
      userId: 'admin',
      title: 'New Order Received',
      message: `${formData.name} placed an order of ₹${total.toFixed(2)}`,
      read: false,
      createdAt: serverTimestamp()
    };

    // Save user mobile for notifications
    localStorage.setItem('culinaro_user_mobile', formData.mobile);

    // Save order and ensure user exists
    Promise.all([
      setDoc(orderRef, orderData),
      setDoc(userRef, userData, { merge: true }),
      addDoc(adminNotificationRef, adminNotificationData)
    ])
    .then(async () => {
      setLoading(false);
      setSuccess(true);
      setPlacedOrderId(orderId);
      clearCart();
      toast({ title: "Order placed successfully!" });
    })
    .catch(async (error) => {
      setLoading(false);
      const permissionError = new FirestorePermissionError({
        path: orderRef.path,
        operation: 'create',
        requestResourceData: orderData,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  if (success && placedOrderId) {
    const telegramLink = `https://t.me/${botUsername}?start=ORDER_${placedOrderId}`;

    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="font-headline text-3xl">Order Confirmed!</h3>
          <p className="text-muted-foreground">Your order <span className="font-bold text-foreground">#{placedOrderId}</span> has been received.</p>
        </div>

        <div className="w-full bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-4">
          <h4 className="font-bold text-blue-700 dark:text-blue-400">Track on Telegram</h4>
          <p className="text-sm text-blue-600 dark:text-blue-300">
            Get instant real-time updates for your order directly on Telegram!
          </p>
          <Button 
            className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold"
            onClick={() => window.open(telegramLink, '_blank')}
          >
            Get Telegram Order Updates
          </Button>
        </div>

        <Button className="w-full" variant="outline" onClick={() => window.location.href = '/'}>
          Return to Menu
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Full Name</Label>
          <Input 
            id="name" 
            placeholder="Arjun Singh" 
            className="h-12 bg-muted/50 border-none rounded-xl"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobile" className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Mobile Number</Label>
          <Input 
            id="mobile" 
            placeholder="9876543210" 
            className="h-12 bg-muted/50 border-none rounded-xl"
            value={formData.mobile}
            onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
            required
            type="tel"
          />
        </div>
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox 
            id="notifications" 
            checked={formData.allowNotifications} 
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowNotifications: checked === true }))} 
          />
          <Label
            htmlFor="notifications"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 normal-case tracking-normal"
          >
            Allow notifications for real-time order updates
          </Label>
        </div>
      </div>

      <div className="p-6 bg-card rounded-2xl border border-border/50 space-y-4">
        <h4 className="font-bold text-sm uppercase tracking-widest text-primary">Order Summary</h4>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
              <span className="font-bold">₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-border/50 flex justify-between font-bold text-lg">
            <span>Total Payable</span>
            <span className="text-primary">₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <Button type="submit" className="w-full h-14 text-lg font-bold" disabled={loading}>
          {loading ? "Placing Order..." : "Confirm COD Order"}
        </Button>
        <Button type="button" variant="ghost" className="w-full flex items-center gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Edit Selection
        </Button>
      </div>
    </form>
  );
}
