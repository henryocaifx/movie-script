'use server';

import fs from 'fs';
import path from 'path';

export async function saveStoryboardImageAction(index: number, dataUri: string, subDir?: string) {
  try {
    let storyboardDir = path.join(process.cwd(), 'storyboard');
    if (subDir) {
      storyboardDir = path.join(storyboardDir, subDir);
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(storyboardDir)) {
      fs.mkdirSync(storyboardDir, { recursive: true });
    }

    // Extract base64 data
    const base64Data = dataUri.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid image data format');
    }

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
