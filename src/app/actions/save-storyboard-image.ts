'use server';

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

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
    const slicedDir = path.join(process.cwd(), 'storyboard', 'sliced', sessionTimestamp);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(slicedDir)) fs.mkdirSync(slicedDir, { recursive: true });

    const base64Data = dataUri.split(',')[1];
    if (!base64Data) throw new Error('Invalid image data format');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 1. Save the main 4-panel image
    const filename = `storyboard-${sceneNumber}.png`;
    fs.writeFileSync(path.join(dir, filename), imageBuffer);

    // 2. Slice the image into 4 grids (2x2)
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions for slicing');
    }

    const halfWidth = Math.floor(metadata.width / 2);
    const halfHeight = Math.floor(metadata.height / 2);

    const regions = [
      { name: 'grid-1', left: 0, top: 0 },
      { name: 'grid-2', left: halfWidth, top: 0 },
      { name: 'grid-3', left: 0, top: halfHeight },
      { name: 'grid-4', left: halfWidth, top: halfHeight },
    ];

    for (const region of regions) {
      const sliceFilename = `storyboard-${sceneNumber}-${region.name}.png`;
      await image
        .clone()
        .extract({
          left: region.left,
          top: region.top,
          width: halfWidth,
          height: halfHeight
        })
        .toFile(path.join(slicedDir, sliceFilename));
    }

    return { 
      success: true, 
      message: `Saved ${filename} and sliced grids to storyboard/${sessionTimestamp}`, 
      filename 
    };
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

/**
 * Reads a generated storyboard image from disk and returns it as a data URI.
 */
export async function getGeneratedStoryboardAction(
  sceneNumber: number,
  sessionTimestamp: string
) {
  try {
    const dir = path.join(process.cwd(), 'storyboard', 'generated', sessionTimestamp);
    const filename = `storyboard-${sceneNumber}.png`;
    const filePath = path.join(dir, filename);

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `Image not found: ${filePath}` };
    }

    const imageBuffer = fs.readFileSync(filePath);
    const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    return { success: true, dataUri, filename };
  } catch (error: any) {
    console.error('Failed to read generated storyboard image:', error);
    return { success: false, message: error.message || 'Failed to read image from disk.' };
  }
}

/**
 * Reads a sliced grid image from disk and returns it as a data URI.
 */
export async function getSlicedGridAction(
  sceneNumber: number,
  gridNumber: number,
  sessionTimestamp: string
) {
  try {
    const dir = path.join(process.cwd(), 'storyboard', 'sliced', sessionTimestamp);
    const filename = `storyboard-${sceneNumber}-grid-${gridNumber}.png`;
    const filePath = path.join(dir, filename);

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `Sliced image not found: ${filePath}` };
    }

    const imageBuffer = fs.readFileSync(filePath);
    const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    return { success: true, dataUri, filename };
  } catch (error: any) {
    console.error('Failed to read sliced grid image:', error);
    return { success: false, message: error.message || 'Failed to read sliced image from disk.' };
  }
}

/**
 * Saves a revised single-panel image to:
 *   storyboard/sliced/yyyymmdd-hhmm/storyboard-{sceneNumber}-grid-{gridNumber}-revised.png
 */
export async function saveRevisedPanelImageAction(
  sceneNumber: number,
  gridNumber: number,
  dataUri: string,
  sessionTimestamp: string
) {
  try {
    const dir = path.join(process.cwd(), 'storyboard', 'sliced', sessionTimestamp);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const base64Data = dataUri.split(',')[1];
    if (!base64Data) throw new Error('Invalid image data format');

    const filename = `storyboard-${sceneNumber}-grid-${gridNumber}-revised.png`;
    const filePath = path.join(dir, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    return { success: true, message: `Saved revised panel to ${filename}`, filename };
  } catch (error: any) {
    console.error('Failed to save revised panel image:', error);
    return { success: false, message: error.message || 'Failed to save revised image to disk.' };
  }
}
