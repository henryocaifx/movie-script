'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Clapperboard, Film } from 'lucide-react';

const formSchema = z.object({
  charactersDescription: z.string().min(10, 'Please provide more character details.'),
  movieIdea: z.string().min(20, 'Please elaborate a bit more on your movie premise.'),
});

type FormValues = z.infer<typeof formSchema>;

interface StoryboardInputProps {
  onSubmit: (values: FormValues) => void;
  isLoading: boolean;
}

export function StoryboardInput({ onSubmit, isLoading }: StoryboardInputProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      charactersDescription: '',
      movieIdea: '',
    },
  });

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <Card className="glass-panel border-none shadow-2xl overflow-hidden">
        <div className="h-2 cinematic-gradient" />
        <CardHeader className="space-y-1 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <Clapperboard className="text-primary h-6 w-6" />
            <span className="text-primary font-bold tracking-tighter text-lg uppercase">Production Deck</span>
          </div>
          <CardTitle className="text-4xl font-headline font-bold">Initialize New Script</CardTitle>
          <CardDescription className="text-lg">
            Describe your cast and the core premise. Our AI Cinematographer will handle the pacing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="charactersDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-md font-semibold">
                      <Users className="h-4 w-4 text-accent" />
                      Character Manifest
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., Alex (28), a cynical noir detective with a heavy wool coat. Maya (30), a high-tech thief wearing sleek obsidian armor..." 
                        className="min-h-[100px] bg-background/50 border-border/50 focus:border-primary"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>Define names, ages, clothing, and distinguishing traits for consistency.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="movieIdea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-md font-semibold">
                      <Film className="h-4 w-4 text-accent" />
                      Premise / Core Idea
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., In a neon-drenched futuristic Tokyo, a retired detective is pulled back into action when a digital ghost starts haunting the city's power grid..." 
                        className="min-h-[150px] bg-background/50 border-border/50 focus:border-primary"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>Describe the basic plot arc or a specific high-stakes sequence.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-bold cinematic-gradient border-none hover:shadow-primary/20 hover:shadow-2xl transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Directing Scenes...
                  </div>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Multi-Scene Storyboard
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-xl glass-panel">
          <p className="text-accent font-bold">8K Cinematic</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Output Quality</p>
        </div>
        <div className="p-4 rounded-xl glass-panel">
          <p className="text-accent font-bold">Gemini 3 Flash</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Core Engine</p>
        </div>
        <div className="p-4 rounded-xl glass-panel">
          <p className="text-accent font-bold">Consistent</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Character Engine</p>
        </div>
      </div>
    </div>
  );
}