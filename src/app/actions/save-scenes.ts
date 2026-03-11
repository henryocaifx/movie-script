'use server';

import fs from 'fs';
import path from 'path';

export async function saveScenesAction(scenes: { filename: string; content: string }[], subDir?: string) {
  try {
    let scenesDir = path.join(process.cwd(), 'scenes');
    if (subDir) {
      scenesDir = path.join(scenesDir, subDir);
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(scenesDir)) {
      fs.mkdirSync(scenesDir, { recursive: true });
    }

    // Write each file
    for (const scene of scenes) {
      const filePath = path.join(scenesDir, scene.filename);
      fs.writeFileSync(filePath, scene.content, 'utf8');
    }

    return {
      success: true,
      message: `Successfully saved ${scenes.length} scenes to ${scenesDir}.`,
      path: scenesDir
    };
  } catch (error: any) {
    console.error('Failed to save scenes:', error);
    return { success: false, message: error.message || 'Failed to save scenes to disk.' };
  }
}

export async function getSceneAction(filename: string, subDir: string) {
  try {
    const filePath = path.join(process.cwd(), 'scenes', subDir, filename);
    if (!fs.existsSync(filePath)) {
      return { success: false, message: `File not found: ${filePath}` };
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, content };
  } catch (error: any) {
    console.error('Failed to read scene:', error);
    return { success: false, message: error.message || 'Failed to read scene from disk.' };
  }
}

export async function savePanelAction(
  sceneNumber: string,
  panelIndex: number,
  content: string,
  subDir: string
) {
  try {
    const scenesDir = path.join(process.cwd(), 'scenes', subDir);
    if (!fs.existsSync(scenesDir)) {
      fs.mkdirSync(scenesDir, { recursive: true });
    }

    // 1. Save individual panel file: scene-i-panel-j.md
    const panelFilename = `scene-${sceneNumber}-panel-${panelIndex + 1}.md`;
    const panelFilePath = path.join(scenesDir, panelFilename);
    fs.writeFileSync(panelFilePath, content, 'utf8');

    // 2. Update the main scene file: scene-i.md
    const sceneFilename = `scene-${sceneNumber}.md`;
    const sceneFilePath = path.join(scenesDir, sceneFilename);

    if (fs.existsSync(sceneFilePath)) {
      let sceneContent = fs.readFileSync(sceneFilePath, 'utf8');
      
      // Regex to find and replace the specific panel line
      // Format: [number]. **Panel [number]**: [content]
      const panelLabel = `**Panel ${panelIndex + 1}**:`;
      const regex = new RegExp(`(\\d+\\.\\s*\\*\\*Panel ${panelIndex + 1}\\*\\*:).*`, 'g');
      
      if (regex.test(sceneContent)) {
        sceneContent = sceneContent.replace(regex, `$1 ${content}`);
        fs.writeFileSync(sceneFilePath, sceneContent, 'utf8');
      } else {
        console.warn(`Could not find Panel ${panelIndex + 1} in ${sceneFilename} for update.`);
      }
    }

    return { 
      success: true, 
      message: `Successfully updated Panel ${panelIndex + 1} for Scene ${sceneNumber}.` 
    };
  } catch (error: any) {
    console.error('Failed to save panel:', error);
    return { success: false, message: error.message || 'Failed to save panel to disk.' };
  }
}