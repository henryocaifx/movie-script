'use client';

import React, { useState } from 'react';
import { StoryboardInput } from '@/components/storyboard-input';
import { StoryboardEditor } from '@/components/storyboard-editor';
import { VisualStoryboardGenerator } from '@/components/visual-storyboard-generator';
import { NanoBananaRenderer } from '@/components/nano-banana-renderer';
import { generateCinematicStoryboard } from '@/ai/flows/generate-cinematic-storyboard';
import { parseStoryboard, StoryboardScene } from '@/lib/storyboard-parser';
import { useToast } from '@/hooks/use-toast';
import { Clapperboard, Terminal } from 'lucide-react';
import { getLatestStoryboardContextAction } from '@/app/actions/get-latest-context';

export default function AIFXCast() {
  const [isLoading, setIsLoading] = useState(false);
  const [scenes, setScenes] = useState<StoryboardScene[] | null>(null);
  const [generatedImages, setGeneratedImages] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const handleGenerate = async (values: { charactersDescription: string; movieIdea: string }) => {
    setIsLoading(true);
    setGeneratedImages({}); // Clear previous images
    try {
      // Get context from previous exports
      const contextResult = await getLatestStoryboardContextAction();
      const previousContext = contextResult.success ? contextResult.context : '';

      const rawOutput = await generateCinematicStoryboard({
        ...values,
        previousContext
      });
      const parsedScenes = parseStoryboard(rawOutput);

      if (parsedScenes.length === 0) {
        throw new Error('AI generated a blank storyboard. Please try again with more detail.');
      }

      setScenes(parsedScenes);
      toast({
        title: "Storyboard Drafted",
        description: `Successfully generated ${parsedScenes.length} cinematic scenes.`,
      });
    } catch (error: any) {
      toast({
        title: "AI Generation Failed",
        description: error.message || "An unexpected error occurred during generation.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setScenes(null);
    setGeneratedImages({});
  };

  return (
    <div className="min-h-screen selection:bg-primary selection:text-white">
      {/* Cinematic Header Overlay */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 px-6 h-16 flex items-center">
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg cinematic-gradient">
            <Clapperboard className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-headline font-bold tracking-tighter bg-clip-text text-transparent cinematic-gradient">
            AIFX CAST
          </h1>
        </div>
        <div className="flex-1 flex justify-end">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] uppercase font-bold text-accent">Studio Online</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {!scenes ? (
          <div className="space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
              <h2 className="text-5xl md:text-7xl font-headline font-bold leading-tight">
                Your Movie. <span className="text-primary italic">AI Paced.</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Enter your premise and let Gemini-3 transform it into a professionally timed
                multi-scene storyboard with technical camera direction.
              </p>
            </div>

            <StoryboardInput onSubmit={handleGenerate} isLoading={isLoading} />
          </div>
        ) : (
          <div className="space-y-16">
            <StoryboardEditor initialScenes={scenes} onComplete={handleReset} />
            <VisualStoryboardGenerator
              scenes={scenes}
              generatedImages={generatedImages}
              setGeneratedImages={setGeneratedImages}
            />
            <NanoBananaRenderer
              scenes={scenes}
              generatedImages={generatedImages}
            />
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="mt-20 py-12 border-t border-white/5 bg-black/20">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">


        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground/40">
          © {new Date().getFullYear()} AIFX Cast Studio. All cinematic rights reserved.
        </div>
      </footer>
    </div>
  );
}
