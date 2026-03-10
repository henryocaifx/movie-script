'use client';

import React, { useState } from 'react';
import { StoryboardScene, serializeSceneToMarkdown } from '@/lib/storyboard-parser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Film, CheckCircle, Download } from 'lucide-react';
import { saveScenesAction } from '@/app/actions/save-scenes';
import { useToast } from '@/hooks/use-toast';

interface StoryboardEditorProps {
  initialScenes: StoryboardScene[];
  onComplete: () => void;
}

export function StoryboardEditor({ initialScenes, onComplete }: StoryboardEditorProps) {
  const [scenes, setScenes] = useState<StoryboardScene[]>(initialScenes);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { toast } = useToast();

  const handlePanelChange = (sceneIndex: number, panelIndex: number, value: string) => {
    const newScenes = [...scenes];
    newScenes[sceneIndex].panels[panelIndex] = value;
    setScenes(newScenes);
  };

  const handlePromptChange = (sceneIndex: number, value: string) => {
    const newScenes = [...scenes];
    newScenes[sceneIndex].imagePrompt = value;
    setScenes(newScenes);
  };

  const handleSave = async () => {
    if (hasSubmitted) return;
    setIsSaving(true);

    // Format: YYYYMMDD-HHMM
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') + '-' +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0');

    const exportData = scenes.map((scene, i) => ({
      filename: `scene-${i + 1}.md`,
      content: serializeSceneToMarkdown(scene),
    }));

    const result = await saveScenesAction(exportData, timestamp);

    if (result.success) {
      toast({
        title: "Export Successful",
        description: result.message,
      });
      setHasSubmitted(true);
    } else {
      toast({
        title: "Export Error",
        description: result.message,
        variant: "destructive",
      });

      // Fallback: trigger downloads for web users if local write fails
      exportData.forEach(file => {
        const blob = new Blob([file.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-headline font-bold text-foreground">Interactive Storyboard</h2>
          {!hasSubmitted && <p className="text-muted-foreground">Fine-tune each scene's technical details and prompts.</p>}
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onComplete}>New Idea</Button>
        </div>
      </div>

      {!hasSubmitted && (
        <div className="grid gap-8">
          {scenes.map((scene, sceneIdx) => (
            <Card key={scene.id} className="glass-panel border-none overflow-hidden shadow-2xl">
              <CardHeader className="bg-secondary/50 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full cinematic-gradient flex items-center justify-center text-white font-bold">
                      {sceneIdx + 1}
                    </div>
                    <div>
                      <CardTitle className="font-headline text-xl">Scene: {scene.sceneNumber}</CardTitle>
                      <CardDescription>Multi-panel cinematic sequence</CardDescription>
                    </div>
                  </div>
                  <Film className="text-accent h-5 w-5 opacity-50" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scene.panels.map((panel, panelIdx) => (
                    <div key={panelIdx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                          Panel {panelIdx + 1}
                        </Label>
                        <CheckCircle className="h-3 w-3 text-accent" />
                      </div>
                      <Textarea
                        value={panel}
                        onChange={(e) => handlePanelChange(sceneIdx, panelIdx, e.target.value)}
                        placeholder={`Describe action and camera angle for panel ${panelIdx + 1}...`}
                        className="min-h-[100px] bg-background/50 focus:border-primary/50 transition-all resize-none"
                      />
                    </div>
                  ))}
                </div>

                <Separator className="my-8 opacity-20" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Download className="h-4 w-4 text-accent" />
                      Master Image Generation Prompt (4-Grid)
                    </Label>
                  </div>
                  <Textarea
                    value={scene.imagePrompt}
                    onChange={(e) => handlePromptChange(sceneIdx, e.target.value)}
                    placeholder="The consolidated prompt for all panels..."
                    className="min-h-[120px] bg-secondary/30 font-mono text-sm border-accent/20 focus:border-accent/50 transition-all"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-center pb-12">
        <Button
          size="lg"
          className="px-12 cinematic-gradient text-white border-none shadow-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          onClick={handleSave}
          disabled={isSaving || hasSubmitted}
        >
          {isSaving ? "Writing Files..." : hasSubmitted ? "Files Written & Completed" : "Done Editing & Submit"}
        </Button>
      </div>
    </div>
  );
}