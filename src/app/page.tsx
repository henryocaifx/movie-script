'use client';

import React, { useState } from 'react';
import { StoryboardInput } from '@/components/storyboard-input';
import { StoryboardEditor } from '@/components/storyboard-editor';
import { VisualStoryboardGenerator } from '@/components/visual-storyboard-generator';
import { NanoBananaRenderer } from '@/components/nano-banana-renderer';
import { generateCinematicStoryboard } from '@/ai/flows/generate-cinematic-storyboard';
import { parseStoryboard, StoryboardScene } from '@/lib/storyboard-parser';
import { useToast } from '@/hooks/use-toast';


export default function AIFXCast() {
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<{ name: string; description: string; image?: string }[]>([]);
  const [scenes, setScenes] = useState<StoryboardScene[] | null>(null);
  const [generatedImages, setGeneratedImages] = useState<{ [key: string]: string }>({});
  const [sessionTimestamp, setSessionTimestamp] = useState<string>('');
  const { toast } = useToast();

  const handleGenerate = async (values: { characters: { name: string; description: string; image?: string }[]; movieIdea: string }) => {
    setIsLoading(true);
    setCharacters(values.characters);
    setGeneratedImages({}); // Clear previous images
    // Create a session timestamp for this storyboard run — all scene renders will share this folder
    const now = new Date();
    const ts = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') + '-' +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0');
    setSessionTimestamp(ts);
    try {
      // Format characters for the text AI
      const charactersDescription = values.characters
        .map(c => `${c.name}: ${c.description}`)
        .join('\n');

      const rawOutput = await generateCinematicStoryboard({
        charactersDescription,
        movieIdea: values.movieIdea,
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
    setCharacters([]);
    setGeneratedImages({});
    setSessionTimestamp('');
  };

  return (
    <div className="min-h-screen selection:bg-primary selection:text-white">
      {/* Cinematic Header Overlay */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 px-6 h-16 flex items-center">
        <div className="flex-1" />
        <div className="flex items-center">
          <img
            src="/aifx-cast-header.png"
            alt="AIFX Cast"
            className="h-10 w-auto object-contain"
          />
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
                Turn your idea into a storyboard with AIFX Cast.
              </p>
            </div>

            <StoryboardInput onSubmit={handleGenerate} isLoading={isLoading} />
          </div>
        ) : (
          <div className="space-y-16">
            <StoryboardEditor initialScenes={scenes} onComplete={handleReset} />
            <VisualStoryboardGenerator
              characters={characters}
              scenes={scenes}
              generatedImages={generatedImages}
              setGeneratedImages={setGeneratedImages}
              sessionTimestamp={sessionTimestamp}
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
        <div className="container mx-auto px-4 flex flex-col items-center justify-center">
          <img
            src="/aifx-cast-footer.png"
            alt="AIFX Cast"
            className="h-12 w-auto object-contain"
          />
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground/40">
          © {new Date().getFullYear()} AIFX Cast. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
