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
import { saveStoryboardImageAction } from '@/app/actions/save-storyboard-image';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface VisualStoryboardGeneratorProps {
  scenes: StoryboardScene[];
  generatedImages: { [key: string]: string };
  setGeneratedImages: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export function VisualStoryboardGenerator({
  scenes,
  generatedImages,
  setGeneratedImages
}: VisualStoryboardGeneratorProps) {
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('2k');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCharacterImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAll = async () => {
    if (!characterImage) {
      toast({
        title: "Missing Reference",
        description: "Please upload a character reference image first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    const newImages: { [key: string]: string } = {};
    let previousImage: string | undefined = undefined;

    try {
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];

        // Generate the image
        const imageUrl = await generateVisualStoryboard({
          characterImageUri: characterImage,
          previousStoryboardUri: previousImage,
          promptText: scene.imagePrompt,
          aspectRatio,
          resolution,
        });

        newImages[scene.id] = imageUrl;
        setGeneratedImages(prev => ({ ...prev, [scene.id]: imageUrl }));

        // Save to disk
        await saveStoryboardImageAction(i, imageUrl);

        previousImage = imageUrl;
        setProgress(((i + 1) / scenes.length) * 100);
      }

      toast({
        title: "Visual Production Complete",
        description: `Successfully generated and saved ${scenes.length} storyboards.`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Error",
        description: error.message || "Failed to generate visual storyboards.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
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

  return (
    <div className="mt-16 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-headline font-bold">Visual Production Studio</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Render your scripted scenes into high-fidelity cinematic grids using the Nano Banana 2 visual engine.
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
                Character Reference
              </Label>
              <div
                className="group relative border-2 border-dashed border-white/10 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-all overflow-hidden bg-black/20"
                onClick={() => fileInputRef.current?.click()}
              >
                {characterImage ? (
                  <>
                    <img src={characterImage} alt="Reference" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-xs font-bold text-white uppercase tracking-widest">Change Image</span>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Upload Portrait</span>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
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
            <Button
              className="w-full cinematic-gradient h-12 font-bold"
              onClick={handleGenerateAll}
              disabled={isGenerating || !characterImage}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rendering Scenes...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Render All Scenes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {isGenerating && (
            <Card className="glass-panel border-primary/20 bg-primary/5">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Production in Progress
                  </span>
                  <span className="font-mono">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-white/5" />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6">
            {scenes.map((scene, idx) => {
              const imageUrl = generatedImages[scene.id];
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
                            Download 4-Grid
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
                        <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest">Awaiting Render for Scene {idx + 1}</p>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 bg-secondary/30 flex items-center justify-between">
                    <div>
                      <h4 className="font-headline font-bold text-sm">Scene: {scene.sceneNumber}</h4>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {scene.imagePrompt.substring(0, 100)}...
                      </p>
                    </div>
                    {imageUrl ? (
                      <CheckCircle2 className="text-accent h-5 w-5" />
                    ) : (
                      <AlertCircle className="text-muted-foreground/30 h-5 w-5" />
                    )}
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
