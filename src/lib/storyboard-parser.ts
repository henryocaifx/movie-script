export interface StoryboardScene {
  id: string;
  sceneNumber: string;
  panels: string[];
  imagePrompt: string;
}

export function parseStoryboard(raw: string): StoryboardScene[] {
  const scenes: StoryboardScene[] = [];
  const sceneBlocks = raw.split(/---/).filter(block => block.trim().includes('SCENE_START'));

  sceneBlocks.forEach((block, index) => {
    const sceneNumberMatch = block.match(/SCENE_START:\s*(.*)/);
    const panel1Match = block.match(/PANEL_1:\s*(.*)/);
    const panel2Match = block.match(/PANEL_2:\s*(.*)/);
    const panel3Match = block.match(/PANEL_3:\s*(.*)/);
    const panel4Match = block.match(/PANEL_4:\s*(.*)/);
    const imagePromptMatch = block.match(/IMAGE_PROMPT:\s*([\s\S]*?)(?=SCENE_END|$)/);

    if (sceneNumberMatch) {
      scenes.push({
        id: `scene-${index + 1}`,
        sceneNumber: sceneNumberMatch[1].trim(),
        panels: [
          panel1Match ? panel1Match[1].trim() : '',
          panel2Match ? panel2Match[1].trim() : '',
          panel3Match ? panel3Match[1].trim() : '',
          panel4Match ? panel4Match[1].trim() : '',
        ],
        imagePrompt: imagePromptMatch ? imagePromptMatch[1].trim() : '',
      });
    }
  });

  return scenes;
}

export function serializeSceneToMarkdown(scene: StoryboardScene): string {
  return `# Scene ${scene.sceneNumber}

## Storyboard Panels
1. **Panel 1**: ${scene.panels[0]}
2. **Panel 2**: ${scene.panels[1]}
3. **Panel 3**: ${scene.panels[2]}
4. **Panel 4**: ${scene.panels[3]}

## AI Image Prompt
${scene.imagePrompt}
`;
}