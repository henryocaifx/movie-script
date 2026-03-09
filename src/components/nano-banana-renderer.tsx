'use client';

import React, { useState, useRef } from 'react';
import { StoryboardScene, serializeSceneToMarkdown } from '@/lib/storyboard-parser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ImageIcon, Wand2, Download, CheckCircle2, Loader2, Cpu, History } from 'lucide-react';
import { generateVisualStoryboard } from '@/ai/flows/generate-visual-storyboard';
import { saveStoryboardImageAction } from '@/app/actions/save-storyboard-image';
import { useToast } from '@/hooks/use-toast';

interface NanoBananaRendererProps {
  scenes: StoryboardScene[];
}

export function NanoBananaRenderer({ scenes }: NanoBananaRendererProps) {
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('2k');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<{ [key: string]: string }>({});
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

  const handleGenerate = async () => {
    if (!characterImage) {
      toast({
        title: "Missing Reference",
        description: "Please upload a character reference image.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    let previousImage: string | undefined = undefined;

    try {
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        
        // The prompt is the full content of the scene markdown as requested
        const fullPrompt = serializeSceneToMarkdown(scene);
        
        const imageUrl = await generateVisualStoryboard({
          characterImageUri: characterImage,
          characterName: characterName,
          previousStoryboardUri: previousImage,
          promptText: fullPrompt,
          aspectRatio,
          resolution,
        });

        setGeneratedImages(prev => ({ ...prev, [scene.id]: imageUrl }));
        
        // Save to /storyboard/storyboard-i.png
        await saveStoryboardImageAction(i, imageUrl);
        
        // Continuity reference for the next iteration
        previousImage = imageUrl;
        setProgress(((i + 1) / scenes.length) * 100);
      }

      toast({
        title: "Gemini 3.1 Render Complete",
        description: `Successfully produced ${scenes.length} sequential storyboards with character consistency.`,
      });
    } catch (error: any) {
      toast({
        title: "Render Error",
        description: error.message || "Failed to generate visual sequence.",
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
    <div className="mt-24 space-y-10 border-t border-white/10 pt-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
      <div className="flex items-center gap-4 justify-center">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Cpu className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Next-Gen Engine</span>
          </div>
          <h2 className="text-4xl font-headline font-bold text-center">Nano Banana 2 (Gemini 3.1)</h2>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="glass-panel border-primary/10 lg:col-span-1 h-fit sticky top-24 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Character Reference</CardTitle>
            <CardDescription>Upload the character(s) and set their identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Character Name</Label>
              <Input 
                placeholder="Name (must match your script)" 
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                className="bg-background/50"
              />
              
              <div 
                className="group relative border-2 border-dashed border-white/10 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-all overflow-hidden bg-black/40"
                onClick={() => fileInputRef.current?.click()}
              >
                {characterImage ? (
                  <>
                    <img src={characterImage} alt="Reference" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-xs font-bold text-white uppercase tracking-widest">Update Portait</span>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="mt-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Upload Portrait</span>
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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="bg-background/50 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2k">2K Studio</SelectItem>
                    <SelectItem value="4k">4K Ultra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger className="bg-background/50 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 Cinema</SelectItem>
                    <SelectItem value="2.35:1">2.35:1 Anamorphic</SelectItem>
                    <SelectItem value="4:3">4:3 Academy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full cinematic-gradient h-12 font-bold shadow-lg" 
              onClick={handleGenerate}
              disabled={isGenerating || !characterImage}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Render Sequence (3.1)
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary">
                <span>Multi-Image Continuity Processing</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1 bg-white/5" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scenes.map((scene, idx) => {
              const imageUrl = generatedImages[scene.id];
              return (
                <Card key={scene.id} className="glass-panel border-none overflow-hidden group relative">
                  <div className="aspect-video bg-black/60 relative">
                    {imageUrl ? (
                      <>
                        <img 
                          src={imageUrl} 
                          alt={`Scene ${scene.sceneNumber}`} 
                          className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="w-full bg-white/10 backdrop-blur-xl border-white/10 hover:bg-white/20"
                            onClick={() => downloadImage(scene.id, idx)}
                          >
                            <Download className="h-3 w-3 mr-2" />
                            Download storyboard-{idx + 1}.png
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/20">
                        <History className="h-8 w-8 mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Awaiting Sequence {idx + 1}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
                      Scene {scene.sceneNumber}
                    </div>
                  </div>
                  {imageUrl && (
                    <div className="p-3 bg-primary/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-accent" />
                        <span className="text-[10px] font-bold text-accent uppercase tracking-widest">3.1 Render Verified</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">SEQ_REF_{idx}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
