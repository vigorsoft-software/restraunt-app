
"use client"

import { useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function CheckoutForm({ onBack }: { onBack: () => void }) {
  const { items, total, clearCart } = useCart();
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    
    if (!formData.name || !formData.mobile) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    
    const orderId = Math.random().toString(36).substr(2, 9);
    const orderRef = doc(firestore, 'orders', orderId);
    
    const orderData = {
      id: orderId,
      customerName: formData.name,
      mobileNumber: formData.mobile,
      items: items,
      totalAmount: total,
      status: 'pending' as const,
      createdAt: serverTimestamp()
    };

    setDoc(orderRef, orderData)
      .then(() => {
        setLoading(false);
        setSuccess(true);
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

  if (success) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="font-headline text-3xl">Gourmet Confirmed</h3>
          <p className="text-muted-foreground">Your order has been received. Our chef is beginning the preparation.</p>
        </div>
        <Button className="w-full" onClick={() => window.location.href = '/'}>
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
            placeholder="+91 98765 43210" 
            className="h-12 bg-muted/50 border-none rounded-xl"
            value={formData.mobile}
            onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
            required
            type="tel"
          />
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
