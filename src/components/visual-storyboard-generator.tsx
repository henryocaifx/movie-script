'use client';

import React, { useState, useRef } from 'react';
import { StoryboardScene } from '@/lib/storyboard-parser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ImageIcon, Wand2, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { generateVisualStoryboard } from '@/ai/flows/generate-visual-storyboard';
import { saveGeneratedStoryboardAction } from '@/app/actions/save-storyboard-image';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface VisualStoryboardGeneratorProps {
  characters: { name: string; description: string; image?: string }[];
  scenes: StoryboardScene[];
  generatedImages: { [key: string]: string };
  setGeneratedImages: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  sessionTimestamp: string;
}

export function VisualStoryboardGenerator({
  characters,
  scenes,
  generatedImages,
  setGeneratedImages,
  sessionTimestamp
}: VisualStoryboardGeneratorProps) {
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('2k');
  const [generatingScenes, setGeneratingScenes] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const isAnyCharacterMissing = characters.some(c => !c.image);

  const generateScene = async (index: number) => {
    if (isAnyCharacterMissing) {
      toast({
        title: "Missing References",
        description: "Please upload portraits for all characters first.",
        variant: "destructive"
      });
      return;
    }

    const scene = scenes[index];
    setGeneratingScenes(prev => ({ ...prev, [scene.id]: true }));

    try {
      // Find previous scene image for continuity
      let previousImage: string | undefined = undefined;
      if (index > 0) {
        previousImage = generatedImages[scenes[index - 1].id];
      }

      // Format characters for the AI
      const characterRefs = characters.map(c => ({
        name: c.name,
        imageUri: c.image || ''
      }));

      // Generate the image
      const imageUrl = await generateVisualStoryboard({
        characters: characterRefs,
        previousStoryboardUri: previousImage,
        promptText: scene.imagePrompt,
        aspectRatio,
        resolution,
      });

      setGeneratedImages(prev => ({ ...prev, [scene.id]: imageUrl }));

      // Save to storyboard/generated/yyyymmdd-hhmm/storyboard-{sceneNumber}.png
      await saveGeneratedStoryboardAction(
        parseInt(scene.sceneNumber),
        imageUrl,
        sessionTimestamp
      );

      toast({
        title: `Scene ${scene.sceneNumber} Rendered`,
        description: "Storyboard panel updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Generation Error",
        description: error.message || `Failed to generate Scene ${scene.sceneNumber}.`,
        variant: "destructive"
      });
    } finally {
      setGeneratingScenes(prev => ({ ...prev, [scene.id]: false }));
    }
  };

  const downloadImage = (sceneId: string, index: number) => {
    const url = generatedImages[sceneId];
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = `storyboard-${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isGlobalGenerating = Object.values(generatingScenes).some(Boolean);

  return (
    <div className="mt-16 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-headline font-bold">Visual Production Studio</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          One-by-one cinematic rendering. Choose your sequence and refine individual frames.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="glass-panel border-none lg:col-span-1 h-fit sticky top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Engine Configuration
            </CardTitle>
            <CardDescription>Setup your visual parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Character Reference Portraits
              </Label>
              <div className="grid grid-cols-2 gap-4">
                {characters.map((char) => (
                  <div key={char.name} className="space-y-2">
                    <p className="text-[10px] font-bold truncate text-muted-foreground uppercase">{char.name}</p>
                    <div
                      className="group relative border-2 border-white/10 rounded-xl aspect-square flex flex-col items-center justify-center overflow-hidden bg-black/20"
                    >
                      {char.image ? (
                        <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center opacity-30 text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                          <span className="mt-2 text-[8px] font-bold uppercase tracking-widest text-center px-1">No Portrait</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 Cinema</SelectItem>
                    <SelectItem value="2.35:1">2.35:1 Panavision</SelectItem>
                    <SelectItem value="4:3">4:3 Academy</SelectItem>
                    <SelectItem value="1:1">1:1 Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2k">2K Studio</SelectItem>
                    <SelectItem value="4k">4K Ultra HD</SelectItem>
                    <SelectItem value="8k">8K Cinema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <p className="text-[10px] uppercase font-bold tracking-widest text-primary">Ready for Production</p>
              <p className="text-xs text-muted-foreground mt-1">Generate scenes using the controls on each card below.</p>
            </div>
          </CardFooter>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6">
            {scenes.map((scene, idx) => {
              const imageUrl = generatedImages[scene.id];
              const isGenerating = generatingScenes[scene.id];
              const isPreviousGenerated = idx === 0 || !!generatedImages[scenes[idx - 1].id];

              return (
                <Card key={scene.id} className="glass-panel border-none overflow-hidden group">
                  <div className="relative aspect-video bg-black/40">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={`Scene ${scene.sceneNumber}`}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute top-4 left-4 h-8 w-8 rounded-full cinematic-gradient flex items-center justify-center text-white font-bold text-xs shadow-xl">
                          {idx + 1}
                        </div>
                        <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-black/60 backdrop-blur-md border-white/10 hover:bg-black/80"
                            onClick={() => downloadImage(scene.id, idx)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest text-primary animate-pulse">Rendering Pixel Data...</p>
                          </>
                        ) : (
                          <>
                            <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-widest">Awaiting Render for Scene {idx + 1}</p>
                            {!isPreviousGenerated && (
                              <p className="text-[10px] text-primary/60 font-mono uppercase tracking-[0.2em]">Locked: Generate Scene {idx} First</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 bg-secondary/30">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-headline font-bold text-sm">Scene: {scene.sceneNumber}</h4>
                        <p className="text-xs text-muted-foreground truncate max-w-sm">
                          {scene.imagePrompt.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {imageUrl ? (
                          <CheckCircle2 className="text-accent h-5 w-5" />
                        ) : (
                          <AlertCircle className="text-muted-foreground/30 h-5 w-5" />
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-background/50 border-white/10"
                        onClick={() => generateScene(idx)}
                        disabled={isGlobalGenerating || isAnyCharacterMissing || !isPreviousGenerated}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        ) : (
                          <Wand2 className="h-3 w-3 mr-2" />
                        )}
                        {imageUrl ? "Re-generate" : "Generate Scene"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
