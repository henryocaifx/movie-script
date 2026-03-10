'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Clapperboard, Film, Plus, Trash2, ImageIcon } from 'lucide-react';

const formSchema = z.object({
  characters: z.array(z.object({
    name: z.string().min(1, 'Character name is required.'),
    description: z.string().min(10, 'Please provide more character details.'),
    image: z.string().optional(),
  })).min(1, 'Please add at least one character.'),
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
      characters: [{ name: '', description: '', image: '' }],
      movieIdea: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "characters"
  });

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue(`characters.${index}.image`, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
            Describe your cast and premise. Our AI Cinematographer will handle the pacing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="flex items-center gap-2 text-md font-semibold">
                    <Users className="h-4 w-4 text-accent" />
                    Character Manifest
                  </FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 bg-background/50 border-white/10"
                    onClick={() => append({ name: '', description: '', image: '' })}
                  >
                    <Plus className="h-3 w-3" />
                    Add Character
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 rounded-xl bg-background/30 border border-white/5 space-y-4 relative group">
                    <div className="flex gap-4">
                      {/* Character Image Upload */}
                      <FormField
                        control={form.control}
                        name={`characters.${index}.image`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex flex-col items-center">
                                <div
                                  className="relative h-24 w-24 border-2 border-dashed border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all flex items-center justify-center bg-black/20"
                                  onClick={() => {
                                    const input = document.getElementById(`char-image-${index}`);
                                    input?.click();
                                  }}
                                >
                                  {field.value ? (
                                    <>
                                      <img src={field.value} alt="Reference" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-[8px] font-bold text-white uppercase tracking-widest">Change</span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center text-muted-foreground">
                                      <ImageIcon className="h-6 w-6 mb-1" />
                                      <span className="text-[8px] font-bold uppercase tracking-widest">Portrait</span>
                                    </div>
                                  )}
                                </div>
                                <input
                                  id={`char-image-${index}`}
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(index, e)}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex-1 space-y-4">
                        <div className="flex gap-4">
                          <FormField
                            control={form.control}
                            name={`characters.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    placeholder="Character Name (e.g. Alex)"
                                    className="bg-background/50 border-border/50 focus:border-primary"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <FormField
                          control={form.control}
                          name={`characters.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe age, clothing, personality, and distinguishing traits."
                                  className="min-h-[60px] bg-background/50 border-border/50 focus:border-primary"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <FormDescription>Define names, upload reference portraits, and describe details for each character.</FormDescription>
              </div>

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
          <p className="text-accent font-bold">Up to 4K Cinematic</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Output Quality</p>
        </div>
        <div className="p-4 rounded-xl glass-panel">
          <p className="text-accent font-bold">Google Gemini</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Text Engine</p>
        </div>
        <div className="p-4 rounded-xl glass-panel">
          <p className="text-accent font-bold">Nano Banana 2</p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Image Engine</p>
        </div>
      </div>
    </div>
  );
}
