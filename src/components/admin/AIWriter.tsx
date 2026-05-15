"use client"

import { useState } from 'react';
import { generateDishDescription } from '@/ai/flows/generate-dish-description';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function AIWriter({ onGenerated }: { onGenerated: (desc: string) => void }) {
  const [ingredients, setIngredients] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const ingredientList = ingredients.split(',').map(i => i.trim()).filter(Boolean);
    if (ingredientList.length === 0) {
      toast({ title: "Please enter some ingredients", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const result = await generateDishDescription({ ingredients: ingredientList });
      if (result?.description) {
        onGenerated(result.description);
        toast({ title: "Description generated!" });
      }
    } catch (error) {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20 space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="w-5 h-5" />
        <h3 className="font-bold uppercase tracking-wider text-sm">AI Flavor Writer</h3>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ingredients" className="text-xs text-muted-foreground uppercase tracking-widest">Ingredients (comma separated)</Label>
        <Input 
          id="ingredients" 
          placeholder="e.g. Sea bass, Lemon, Thyme, Capers" 
          className="bg-background/50"
          value={ingredients}
          onChange={e => setIngredients(e.target.value)}
        />
      </div>
      <Button 
        type="button" 
        variant="secondary" 
        className="w-full gap-2 font-bold" 
        disabled={loading}
        onClick={handleGenerate}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        Craft Description
      </Button>
    </div>
  );
}