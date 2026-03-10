'use server';

import fs from 'fs';
import path from 'path';

function getTimestamp() {
  const now = new Date();
  return now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') + '-' +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0');
}

/**
 * Saves an individually generated storyboard image to:
 *   storyboard/generated/yyyymmdd-hhmm/storyboard-{sceneNumber}.png
 */
export async function saveGeneratedStoryboardAction(
  sceneNumber: number,
  dataUri: string,
  sessionTimestamp: string
) {
  try {
    const dir = path.join(process.cwd(), 'storyboard', 'generated', sessionTimestamp);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const base64Data = dataUri.split(',')[1];
    if (!base64Data) throw new Error('Invalid image data format');

    const filename = `storyboard-${sceneNumber}.png`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(base64Data, 'base64'));

    return { success: true, message: `Saved ${filename} to storyboard/generated/${sessionTimestamp}`, filename };
  } catch (error: any) {
    console.error('Failed to save generated storyboard image:', error);
    return { success: false, message: error.message || 'Failed to save image to disk.' };
  }
}

/**
 * Saves an archived exported storyboard image to:
 *   storyboard/{subDir}/storyboard-{index+1}.png
 */
export async function saveStoryboardImageAction(index: number, dataUri: string, subDir?: string) {
  try {
    let storyboardDir = path.join(process.cwd(), 'storyboard');
    if (subDir) {
      storyboardDir = path.join(storyboardDir, subDir);
    }

    if (!fs.existsSync(storyboardDir)) {
      fs.mkdirSync(storyboardDir, { recursive: true });
    }

    const base64Data = dataUri.split(',')[1];
    if (!base64Data) throw new Error('Invalid image data format');

    const filename = `storyboard-${index + 1}.png`;
    const filePath = path.join(storyboardDir, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    return {
      success: true,
      message: `Successfully saved ${filename} to ${storyboardDir}.`,
      filename,
      path: storyboardDir
    };
  } catch (error: any) {
    console.error('Failed to save storyboard image:', error);
    return { success: false, message: error.message || 'Failed to save image to disk.' };
  }
}
