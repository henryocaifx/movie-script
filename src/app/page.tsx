'use client';

import React, { useState } from 'react';
import { StoryboardInput } from '@/components/storyboard-input';
import { StoryboardEditor } from '@/components/storyboard-editor';
import { generateCinematicStoryboard } from '@/ai/flows/generate-cinematic-storyboard';
import { parseStoryboard, StoryboardScene } from '@/lib/storyboard-parser';
import { useToast } from '@/hooks/use-toast';
import { Clapperboard, Terminal } from 'lucide-react';

export default function CineScriptAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [scenes, setScenes] = useState<StoryboardScene[] | null>(null);
  const { toast } = useToast();

  const handleGenerate = async (values: { charactersDescription: string; movieIdea: string }) => {
    setIsLoading(true);
    try {
      const rawOutput = await generateCinematicStoryboard(values);
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
  };

  return (
    <div className="min-h-screen selection:bg-primary selection:text-white">
      {/* Cinematic Header Overlay */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg cinematic-gradient">
            <Clapperboard className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-headline font-bold tracking-tighter bg-clip-text text-transparent cinematic-gradient">
            CINESCRIPT AI
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-6 text-xs uppercase tracking-widest font-semibold text-muted-foreground">
          <span className="hover:text-primary transition-colors cursor-default">Storyboard</span>
          <span className="hover:text-primary transition-colors cursor-default">Cinematography</span>
          <span className="hover:text-primary transition-colors cursor-default">Export</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] uppercase font-bold text-accent">Studio Online</span>
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
          <StoryboardEditor initialScenes={scenes} onComplete={handleReset} />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="mt-20 py-12 border-t border-white/5 bg-black/20">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-muted-foreground" />
              <span className="font-headline font-bold text-muted-foreground tracking-tighter">CINESCRIPT AI</span>
            </div>
            <p className="text-sm text-muted-foreground/60 max-w-xs">
              Professional cinematography tools powered by the next generation of generative AI.
            </p>
          </div>
          <div className="flex gap-12">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Capabilities</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>Character Continuity</li>
                <li>Scene Sequencing</li>
                <li>Camera Technicals</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">System</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Terminal className="h-3 w-3" />
                  Gemini-3 Flash
                </li>
                <li>8K Prompting</li>
                <li>MD Export</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground/40">
          © {new Date().getFullYear()} CineScript AI Studio. All cinematic rights reserved.
        </div>
      </footer>
    </div>
  );
}