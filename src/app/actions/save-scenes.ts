'use server';

import fs from 'fs';
import path from 'path';

export async function saveScenesAction(scenes: { filename: string; content: string }[]) {
  try {
    const scenesDir = path.join(process.cwd(), 'scenes');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(scenesDir)) {
      fs.mkdirSync(scenesDir, { recursive: true });
    }

    // Write each file
    for (const scene of scenes) {
      const filePath = path.join(scenesDir, scene.filename);
      fs.writeFileSync(filePath, scene.content, 'utf8');
    }

    return { success: true, message: `Successfully saved ${scenes.length} scenes to the /scenes directory.` };
  } catch (error: any) {
    console.error('Failed to save scenes:', error);
    return { success: false, message: error.message || 'Failed to save scenes to disk.' };
  }
}