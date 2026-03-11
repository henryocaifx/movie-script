'use client';

import React, { useState, useRef } from 'react';
import { StoryboardScene, serializeSceneToMarkdown, parseMarkdownToScene } from '@/lib/storyboard-parser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ImageIcon, Wand2, Download, CheckCircle2, AlertCircle, Loader2, Save } from 'lucide-react';
import { generateVisualStoryboard, generateRevisedPanel } from '@/ai/flows/generate-visual-storyboard';
import { saveGeneratedStoryboardAction, getGeneratedStoryboardAction, getSlicedGridAction, saveRevisedPanelImageAction } from '@/app/actions/save-storyboard-image';
import { saveScenesAction, getSceneAction, savePanelAction } from '@/app/actions/save-scenes';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface VisualStoryboardGeneratorProps {
  characters: { name: string; description: string; image?: string }[];
  artStyle: string;
  scenes: StoryboardScene[];
  generatedImages: { [key: string]: string };
  setGeneratedImages: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  sessionTimestamp: string;
  onReset: () => void;
}

export function VisualStoryboardGenerator({
  characters,
  artStyle,
  scenes,
  generatedImages,
  setGeneratedImages,
  sessionTimestamp,
  onReset
}: VisualStoryboardGeneratorProps) {
  const [localScenes, setLocalScenes] = useState<StoryboardScene[]>(scenes);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('2k');
  const [generatingScenes, setGeneratingScenes] = useState<{ [key: string]: boolean }>({});
  const [savingScenes, setSavingScenes] = useState<{ [key: string]: boolean }>({});
  const [revisingPanels, setRevisingPanels] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const handlePanelChange = (sceneIdx: number, panelIdx: number, value: string) => {
    const newScenes = [...localScenes];
    newScenes[sceneIdx].panels[panelIdx] = value;
    setLocalScenes(newScenes);
  };

  const handlePromptChange = (sceneIdx: number, value: string) => {
    const newScenes = [...localScenes];
    newScenes[sceneIdx].imagePrompt = value;
    setLocalScenes(newScenes);
  };

  const saveEdition = async (idx: number) => {
    const scene = localScenes[idx];
    setSavingScenes(prev => ({ ...prev, [scene.id]: true }));

    try {
      const content = serializeSceneToMarkdown(scene);
      const result = await saveScenesAction(
        [{ filename: `scene-${idx + 1}.md`, content }],
        sessionTimestamp
      );

      if (result.success) {
        toast({
          title: "Scene Updated",
          description: `Successfully saved changes to Scene ${idx + 1}.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Save Error",
        description: error.message || "Failed to save scene changes.",
        variant: "destructive"
      });
    } finally {
      setSavingScenes(prev => ({ ...prev, [scene.id]: false }));
    }
  };

  const revisePanel = async (sceneIdx: number, panelIdx: number) => {
    const scene = localScenes[sceneIdx];
    const panelContent = scene.panels[panelIdx];
    const key = `${scene.id}-p${panelIdx}`;
    
    setRevisingPanels(prev => ({ ...prev, [key]: true }));

    try {
      // 1. Save MD content
      const saveResult = await savePanelAction(
        scene.sceneNumber,
        panelIdx,
        panelContent,
        sessionTimestamp
      );

      if (!saveResult.success) throw new Error(saveResult.message);

      // 2. Fetch previous grid image for continuity
      const prevGridResult = await getSlicedGridAction(
        parseInt(scene.sceneNumber),
        panelIdx + 1,
        sessionTimestamp
      );

      if (!prevGridResult.success || !prevGridResult.dataUri) {
        throw new Error(`Could not find previous grid image: ${prevGridResult.message}`);
      }

      // 3. Format characters
      const characterRefs = characters.map(c => ({
        name: c.name,
        imageUri: c.image || ''
      }));

      // 4. Generate Revised Image via AI
      const revisedImageUrl = await generateRevisedPanel({
        characters: characterRefs,
        panelContent: panelContent,
        previousGridUri: prevGridResult.dataUri,
        aspectRatio: aspectRatio,
        resolution: resolution, // Keeping same as master config for quality
      });

      // 5. Save the revised image to disk
      await saveRevisedPanelImageAction(
        parseInt(scene.sceneNumber),
        panelIdx + 1,
        revisedImageUrl,
        sessionTimestamp
      );

      toast({
        title: "Panel Revised & Rendered",
        description: `Panel ${panelIdx + 1} of Scene ${scene.sceneNumber} updated with new render.`,
      });
    } catch (error: any) {
      toast({
        title: "Revision Error",
        description: error.message || "Failed to revise panel or generate image.",
        variant: "destructive"
      });
    } finally {
      setRevisingPanels(prev => ({ ...prev, [key]: false }));
    }
  };

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

    const sceneId = localScenes[index].id;
    const sceneNumber = localScenes[index].sceneNumber;
    setGeneratingScenes(prev => ({ ...prev, [sceneId]: true }));

    try {
      // 1. Auto-save current UI state to disk before generating
      // This ensures the "Source of Truth" file is updated with user edits
      const currentScene = localScenes[index];
      const markdownContent = serializeSceneToMarkdown(currentScene);

      const saveResult = await saveScenesAction(
        [{ filename: `scene-${sceneNumber}.md`, content: markdownContent }],
        sessionTimestamp
      );

      if (!saveResult.success) {
        console.warn("Failed to auto-save scene to disk before generation:", saveResult.message);
      }

      // 2. Find previous scene image for continuity
      let previousImage: string | undefined = undefined;
      const currentSceneNumber = parseInt(sceneNumber);

      if (currentSceneNumber > 1) {
        // "only reference from the png file with the correct number"
        const prevResult = await getGeneratedStoryboardAction(
          currentSceneNumber - 1,
          sessionTimestamp
        );

        if (prevResult.success && prevResult.dataUri) {
          previousImage = prevResult.dataUri;
          console.log(`Maintaining continuity with storyboard-${currentSceneNumber - 1}.png`);
        } else {
          console.warn(`Could not find previous storyboard image for Scene ${currentSceneNumber}:`, prevResult.message);
          // Fallback to memory if disk read fails
          previousImage = generatedImages[localScenes[index - 1]?.id];
        }
      }

      // 3. Format characters for the AI
      const characterRefs = characters.map(c => ({
        name: c.name,
        imageUri: c.image || ''
      }));

      // 4. Generate the image using the full markdown source of the scene
      const imageUrl = await generateVisualStoryboard({
        characters: characterRefs,
        artStyle,
        previousStoryboardUri: previousImage,
        sceneNumber: currentSceneNumber,
        promptText: markdownContent,
        aspectRatio,
        resolution,
      });

      setGeneratedImages(prev => ({ ...prev, [sceneId]: imageUrl }));

      // 5. Save the generated image
      await saveGeneratedStoryboardAction(
        parseInt(sceneNumber),
        imageUrl,
        sessionTimestamp
      );

      toast({
        title: `Scene ${sceneNumber} Rendered`,
        description: "Storyboard updated and changes saved to disk.",
      });
    } catch (error: any) {
      toast({
        title: "Generation Error",
        description: error.message || `Failed to generate Scene ${index + 1}.`,
        variant: "destructive"
      });
    } finally {
      setGeneratingScenes(prev => ({ ...prev, [sceneId]: false }));
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
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-8">
        <div className="text-left space-y-2">
          <h2 className="text-4xl font-headline font-bold">Visual Production Studio</h2>
          <p className="text-muted-foreground">
            One-by-one cinematic rendering. Edit panels and prompts below before generating.
          </p>
        </div>
        <Button variant="outline" className="h-10 bg-background/50 border-white/10" onClick={onReset}>
          New Production
        </Button>
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
                    <SelectItem value="21:9">21:9 Panavision</SelectItem>
                    <SelectItem value="4:3">4:3 Academy</SelectItem>
                    <SelectItem value="1:1">1:1 Square</SelectItem>
                    <SelectItem value="9:16">9:16 Vertical</SelectItem>
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
                    <SelectItem value="1K">1K Studio</SelectItem>
                    <SelectItem value="2K">2K Ultra HD</SelectItem>
                    <SelectItem value="4K">4K Cinema</SelectItem>
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
            {localScenes.map((scene, idx) => {
              const imageUrl = generatedImages[scene.id];
              const isGenerating = generatingScenes[scene.id];
              const isSaving = savingScenes[scene.id];
              const isPreviousGenerated = idx === 0 || !!generatedImages[localScenes[idx - 1].id];

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

                    <Separator className="my-6 opacity-20" />

                    {/* Inline Editor */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        {scene.panels.map((panel, panelIdx) => (
                          <div key={panelIdx} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                Panel {panelIdx + 1}
                              </Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 px-2 text-[8px] uppercase tracking-widest text-accent hover:text-accent/80 hover:bg-accent/5"
                                onClick={() => revisePanel(idx, panelIdx)}
                                disabled={revisingPanels[`${scene.id}-p${panelIdx}`]}
                              >
                                {revisingPanels[`${scene.id}-p${panelIdx}`] ? (
                                  <Loader2 className="h-2 w-2 animate-spin mr-1" />
                                ) : (
                                  <Wand2 className="h-2 w-2 mr-1" />
                                )}
                                Revise
                              </Button>
                            </div>
                            <Textarea
                              value={panel}
                              onChange={(e) => handlePanelChange(idx, panelIdx, e.target.value)}
                              className="min-h-[80px] text-xs bg-background/20 border-white/5 focus:border-primary/30 resize-none"
                              placeholder={`Panel ${panelIdx + 1} details...`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-accent" />
                          Master Image Prompt (4-Grid)
                        </Label>
                        <Textarea
                          value={scene.imagePrompt}
                          onChange={(e) => handlePromptChange(idx, e.target.value)}
                          className="min-h-[100px] text-xs bg-secondary/20 font-mono border-white/5 focus:border-accent/30"
                          placeholder="Technical prompt for the 4-panel render..."
                        />
                      </div>

                      <Button
                        size="sm"
                        className="w-full bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all gap-2 h-9"
                        onClick={() => saveEdition(idx)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        Submit Edition
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
