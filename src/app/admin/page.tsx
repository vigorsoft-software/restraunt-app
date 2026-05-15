"use client"

import { useState } from 'react';
import { INITIAL_PRODUCTS, mockOrders } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AIWriter } from '@/components/admin/AIWriter';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { LayoutDashboard, ShoppingCart, Package, Settings, Plus, Save } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');
  const [editingProduct, setEditingProduct] = useState({
    name: '',
    description: '',
    price: '',
    ingredients: ''
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
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

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-headline">
              {activeTab === 'inventory' ? 'Inventory Console' : 'Order Flow'}
            </h1>
            {activeTab === 'inventory' && (
              <Button className="gap-2 font-bold rounded-full">
                <Plus className="w-5 h-5" /> New Product
              </Button>
            )}
          </div>

          {activeTab === 'inventory' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add/Edit Product Form */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="bg-card border-border/50 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg uppercase tracking-widest text-muted-foreground">Quick Edit</CardTitle>
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
                    
                    {/* GenAI Integration */}
                    <AIWriter 
                      onGenerated={(desc) => setEditingProduct(p => ({...p, description: desc}))} 
                    />

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider font-bold">Menu Description</Label>
                      <Textarea 
                        placeholder="Generated or manual description..." 
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
                        <Button className="w-full gap-2 font-bold">
                          <Save className="w-4 h-4" /> Save Dish
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Product List */}
              <div className="lg:col-span-2">
                <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
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
                      {INITIAL_PRODUCTS.map(p => (
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
                </Card>
              </div>
            </div>
          ) : (
            <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold">Order ID</TableHead>
                    <TableHead className="font-bold">Customer</TableHead>
                    <TableHead className="font-bold">Contact</TableHead>
                    <TableHead className="font-bold text-right">Amount</TableHead>
                    <TableHead className="font-bold text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                        No orders received today.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mockOrders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">#{o.id.toUpperCase()}</TableCell>
                        <TableCell className="font-bold">{o.customerName}</TableCell>
                        <TableCell className="text-muted-foreground">{o.mobileNumber}</TableCell>
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
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}